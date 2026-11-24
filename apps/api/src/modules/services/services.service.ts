import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';

@Injectable()
export class ServicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getWorkerService(serviceId: string, workerId: string) {
    const { data, error } = await this.supabase.admin
      .from('services')
      .select('id, status, started_at, completed_at')
      .eq('id', serviceId)
      .eq('worker_id', workerId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException('No se pudo consultar el servicio.');
    if (!data) throw new NotFoundException('No se encontró el servicio.');
    return data;
  }

  async updateStatus(serviceId: string, workerId: string, value: unknown) {
    if (value !== 'in_progress' && value !== 'completed') {
      throw new BadRequestException('El estado solicitado no es válido.');
    }
    const { data, error } = await this.supabase.admin.rpc('transition_service_status', {
      p_service_id: serviceId,
      p_actor_id: workerId,
      p_new_status: value,
    });
    if (error?.code === 'P0002') throw new NotFoundException('No se encontró el servicio.');
    if (error?.code === '42501') throw new NotFoundException('No se encontró el servicio.');
    if (error?.code === '22023') throw new ConflictException('El servicio ya no permite ese cambio de estado.');
    if (error) throw new InternalServerErrorException('No se pudo actualizar el estado del servicio.');
    return data;
  }
}
