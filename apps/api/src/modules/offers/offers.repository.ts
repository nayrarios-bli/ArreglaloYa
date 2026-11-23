import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';

export interface RequestOfferContext {
  id: string;
  category_id: string;
  zone_id: string;
  status: string;
  expires_at: string;
}

export interface CreatedOffer {
  id: string;
  request_id: string;
  worker_id: string;
  estimated_amount: number;
  requires_visit: boolean;
  message: string | null;
  status: string;
  created_at: string;
}

@Injectable()
export class OffersRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getRequest(requestId: string): Promise<RequestOfferContext | null> {
    const { data, error } = await this.supabaseService.admin
      .from('repair_requests')
      .select('id, category_id, zone_id, status, expires_at')
      .eq('id', requestId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo consultar la solicitud.',
      );
    }

    return data as RequestOfferContext | null;
  }

  async getWorkerReviewStatus(workerId: string): Promise<string | null> {
    const { data, error } = await this.supabaseService.admin
      .from('worker_profiles')
      .select('review_status')
      .eq('user_id', workerId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo consultar el perfil del trabajador.',
      );
    }

    return (data?.review_status as string | undefined) ?? null;
  }

  async workerHasCategory(
    workerId: string,
    categoryId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabaseService.admin
      .from('worker_categories')
      .select('worker_id')
      .eq('worker_id', workerId)
      .eq('category_id', categoryId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo validar la especialidad.',
      );
    }

    return data !== null;
  }

  async workerHasZone(workerId: string, zoneId: string): Promise<boolean> {
    const { data, error } = await this.supabaseService.admin
      .from('worker_zones')
      .select('worker_id')
      .eq('worker_id', workerId)
      .eq('zone_id', zoneId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo validar la zona de atención.',
      );
    }

    return data !== null;
  }

  async hasSelectedOffer(requestId: string): Promise<boolean> {
    const { data, error } = await this.supabaseService.admin
      .from('offers')
      .select('id')
      .eq('request_id', requestId)
      .eq('status', 'selected')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo consultar el estado de las ofertas.',
      );
    }

    return data !== null;
  }

  async createOffer(input: {
    requestId: string;
    workerId: string;
    estimatedAmount: number;
    requiresVisit: boolean;
    message: string | null;
  }): Promise<CreatedOffer> {
    const { data, error } = await this.supabaseService.admin
      .from('offers')
      .insert({
        request_id: input.requestId,
        worker_id: input.workerId,
        estimated_amount: input.estimatedAmount,
        requires_visit: input.requiresVisit,
        message: input.message,
      })
      .select(
        'id, request_id, worker_id, estimated_amount, requires_visit, message, status, created_at',
      )
      .single();

    if (error?.code === '23505') {
      throw new ConflictException(
        'Ya presentaste una oferta para esta solicitud.',
      );
    }

    if (error || !data) {
      throw new InternalServerErrorException(
        'No se pudo guardar la oferta.',
      );
    }

    return data as CreatedOffer;
  }
}
