import {
  ConflictException,
  NotFoundException,
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
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
export interface ClientRequestContext {
  id: string;
  client_id: string;
  status: string;
  expires_at: string;
}

export interface RequestOffer {
  id: string;
  request_id: string;
  worker_id: string;
  estimated_amount: number;
  requires_visit: boolean;
  message: string | null;
  status: string;
  created_at: string;
}

export interface SelectedOfferResult {
  offer_id: string;
  service_id: string;
  final_amount: number | null;
  requires_visit: boolean;
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

  async getRequestForClient(
  requestId: string,
): Promise<ClientRequestContext | null> {
  const { data, error } = await this.supabaseService.admin
    .from('repair_requests')
    .select('id, client_id, status, expires_at')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    throw new InternalServerErrorException(
      'No se pudo consultar la solicitud.',
    );
  }

  return data as ClientRequestContext | null;
}

async listOffersForRequest(
  requestId: string,
): Promise<RequestOffer[]> {
  const { data, error } = await this.supabaseService.admin
    .from('offers')
    .select(
      'id, request_id, worker_id, estimated_amount, requires_visit, message, status, created_at',
    )
    .eq('request_id', requestId)
    .eq('status', 'submitted')
    .order('created_at', { ascending: true });

  if (error) {
    throw new InternalServerErrorException(
      'No se pudieron consultar las ofertas.',
    );
  }

  return (data ?? []) as RequestOffer[];
}

async selectOfferAtomically(input: {
  requestId: string;
  offerId: string;
  clientId: string;
}): Promise<SelectedOfferResult> {
  const { data, error } = await this.supabaseService.admin.rpc(
    'select_offer_for_client',
    {
      p_request_id: input.requestId,
      p_offer_id: input.offerId,
      p_client_id: input.clientId,
    },
  );

  if (error) {
    const message = error.message ?? '';

    if (message.includes('REQUEST_NOT_FOUND')) {
      throw new NotFoundException('La solicitud no existe.');
    }

    if (message.includes('NOT_REQUEST_OWNER')) {
      throw new ForbiddenException(
        'No puedes seleccionar ofertas de otra persona.',
      );
    }

    if (
      message.includes('REQUEST_NOT_OPEN') ||
      message.includes('OFFER_NOT_AVAILABLE')
    ) {
      throw new ConflictException(
        'La solicitud o la oferta ya no está disponible.',
      );
    }

    throw new InternalServerErrorException(
      'No se pudo seleccionar la oferta.',
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new InternalServerErrorException(
      'La base de datos no devolvió el resultado de la selección.',
    );
  }

  return result as SelectedOfferResult;
}
async getOfferForPublicProfile(
  requestId: string,
  offerId: string,
): Promise<{ worker_id: string } | null> {
  const { data, error } = await this.supabaseService.admin
    .from('offers')
    .select('worker_id')
    .eq('id', offerId)
    .eq('request_id', requestId)
    .in('status', ['submitted', 'selected'])
    .maybeSingle();

  if (error) {
    throw new InternalServerErrorException(
      'No se pudo consultar la oferta.',
    );
  }

  return data as { worker_id: string } | null;
}

async getPublicWorkerProfile(workerId: string) {
  const client = this.supabaseService.admin;

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', workerId)
    .maybeSingle();

  if (profileError) {
    throw new InternalServerErrorException(
      'No se pudo consultar el perfil público.',
    );
  }

  if (!profile || profile.role !== 'worker') {
    throw new NotFoundException(
      'No se encontró el perfil del trabajador.',
    );
  }

  const { data: workerProfile, error: workerError } = await client
    .from('worker_profiles')
    .select('bio, review_status')
    .eq('user_id', workerId)
    .maybeSingle();

  if (workerError) {
    throw new InternalServerErrorException(
      'No se pudo consultar el perfil público.',
    );
  }

  if (!workerProfile || workerProfile.review_status !== 'approved') {
    throw new NotFoundException(
      'El perfil del trabajador no está disponible.',
    );
  }

  const [categoryRows, zoneRows] = await Promise.all([
    client
      .from('worker_categories')
      .select('category_id')
      .eq('worker_id', workerId),

    client
      .from('worker_zones')
      .select('zone_id')
      .eq('worker_id', workerId),
  ]);

  if (categoryRows.error || zoneRows.error) {
    throw new InternalServerErrorException(
      'No se pudieron consultar especialidades y zonas.',
    );
  }

  const categoryIds =
    categoryRows.data?.map((row) => row.category_id) ?? [];
  const zoneIds = zoneRows.data?.map((row) => row.zone_id) ?? [];

  let specialties: { id: string; name: string }[] = [];
  let serviceZones: { id: string; name: string; city: string }[] = [];

  if (categoryIds.length > 0) {
    const { data, error } = await client
      .from('categories')
      .select('id, name')
      .in('id', categoryIds)
      .eq('is_active', true);

    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las especialidades.',
      );
    }

    specialties = data ?? [];
  }

  if (zoneIds.length > 0) {
    const { data, error } = await client
      .from('service_zones')
      .select('id, name, city')
      .in('id', zoneIds)
      .eq('is_active', true);

    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las zonas.',
      );
    }

    serviceZones = data ?? [];
  }

  return {
    id: profile.id,
    fullName: profile.full_name,
    bio: workerProfile.bio,
    specialties,
    serviceZones,
  };
}
}
