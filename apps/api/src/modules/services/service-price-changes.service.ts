import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';

@Injectable()
export class ServicePriceChangesService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(serviceId: string, actorId: string) {
    const db = this.supabase.admin;
    const { data: service, error: serviceError } = await db.from('services')
      .select('client_id, worker_id, final_amount').eq('id', serviceId).maybeSingle();
    if (serviceError) this.fail(serviceError);
    if (!service || (service.client_id !== actorId && service.worker_id !== actorId)) {
      throw new NotFoundException('No se encontró el servicio.');
    }

    const { data, error } = await db.from('price_change_requests')
      .select('id, reason, base_amount, additional_amount, status, decided_at, created_at')
      .eq('service_id', serviceId).order('created_at', { ascending: false });
    if (error) this.fail(error);
    return { finalAmount: service.final_amount, changes: data ?? [] };
  }

  async request(serviceId: string, workerId: string, input: { amount: number; reason: string }) {
    const { error } = await this.supabase.admin.rpc('request_service_price_change', {
      p_service_id: serviceId,
      p_worker_id: workerId,
      p_amount: input.amount,
      p_reason: input.reason,
    });
    if (error) this.fail(error);
    return { message: 'Aumento enviado para revisión.' };
  }

  async decide(serviceId: string, changeId: string, clientId: string, approve: boolean) {
    const { error } = await this.supabase.admin.rpc('decide_service_price_change', {
      p_service_id: serviceId,
      p_change_id: changeId,
      p_client_id: clientId,
      p_approve: approve,
    });
    if (error) this.fail(error);
    return { message: approve ? 'Aumento aprobado.' : 'Aumento rechazado.' };
  }

  private fail(error: { code: string; message: string }): never {
    if (error.code === 'P0002') throw new NotFoundException(error.message);
    if (error.code === '55000') throw new ConflictException(error.message);
    if (error.code === '22023') throw new BadRequestException(error.message);
    throw new InternalServerErrorException('No se pudieron procesar las solicitudes de aumento.');
  }
}
