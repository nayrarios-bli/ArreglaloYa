import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import type { AppRole } from '../auth/decorators/roles.decorator.js';

type ParticipantRole = Extract<AppRole, 'client' | 'worker'>;

interface ScheduleInput {
  startsAt: string;
  endsAt: string;
}

@Injectable()
export class ScheduleService {
  constructor(private readonly supabase: SupabaseService) {}

  async listForScheduling(userId: string, role: AppRole) {
    const participantRole = this.getParticipantRole(role);
    await this.ensureWorkerApproved(userId, participantRole);
    const participantColumn = participantRole === 'client' ? 'client_id' : 'worker_id';
    const { data, error } = await this.supabase.admin
      .from('services')
      .select('id, request_id, status, scheduled_start, scheduled_end')
      .eq(participantColumn, userId)
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false });

    if (error) this.fail('No se pudieron consultar los servicios programados.');
    const services = data ?? [];
    if (!services.length) return { services: [] };

    const requestIds = services.map((service) => service.request_id);
    const { data: requests, error: requestsError } = await this.supabase.admin
      .from('repair_requests')
      .select('id, title')
      .in('id', requestIds);
    if (requestsError) this.fail('No se pudieron consultar las solicitudes.');
    const titles = new Map((requests ?? []).map((request) => [request.id, request.title]));
    return {
      services: services.map((service) => ({
        ...service,
        title: titles.get(service.request_id) ?? 'Servicio contratado',
      })),
    };
  }

  async updateSchedule(serviceId: string, userId: string, role: AppRole, value: unknown) {
    const participantRole = this.getParticipantRole(role);
    await this.ensureWorkerApproved(userId, participantRole);
    const input = parseSchedule(value);

    const { data: service, error: serviceError } = await this.supabase.admin
      .from('services')
      .select('id, client_id, worker_id, status')
      .eq('id', serviceId)
      .maybeSingle();
    if (serviceError) this.fail('No se pudo consultar el servicio.');
    if (!service) throw new NotFoundException('No se encontró el servicio.');

    const isParticipant = participantRole === 'client'
      ? service.client_id === userId
      : service.worker_id === userId;
    if (!isParticipant) throw new NotFoundException('No se encontró el servicio.');
    if (service.status !== 'scheduled') {
      throw new ConflictException('Solo se puede coordinar el horario de un servicio programado.');
    }

    const { data: overlap, error: overlapError } = await this.supabase.admin
      .from('services')
      .select('id')
      .eq('worker_id', service.worker_id)
      .in('status', ['scheduled', 'in_progress'])
      .neq('id', serviceId)
      .lt('scheduled_start', input.endsAt)
      .gt('scheduled_end', input.startsAt)
      .limit(1)
      .maybeSingle();
    if (overlapError) this.fail('No se pudo verificar la disponibilidad del trabajador.');
    if (overlap) {
      throw new ConflictException('El trabajador ya tiene otro servicio en ese horario. Elige otro.');
    }

    const { data: updated, error: updateError } = await this.supabase.admin
      .from('services')
      .update({ scheduled_start: input.startsAt, scheduled_end: input.endsAt })
      .eq('id', serviceId)
      .eq('worker_id', service.worker_id)
      .eq('status', 'scheduled')
      .select('id, request_id, status, scheduled_start, scheduled_end')
      .maybeSingle();
    if (updateError?.code === '23P01') {
      throw new ConflictException('El trabajador ya tiene otro servicio en ese horario. Elige otro.');
    }
    if (updateError) this.fail('No se pudo guardar el horario.');
    if (!updated) throw new ConflictException('El servicio cambió. Actualiza e inténtalo nuevamente.');
    return updated;
  }

  private getParticipantRole(role: AppRole): ParticipantRole {
    if (role !== 'client' && role !== 'worker') {
      throw new ForbiddenException('Esta operación está disponible para clientes y trabajadores.');
    }
    return role;
  }

  private async ensureWorkerApproved(userId: string, role: ParticipantRole) {
    if (role !== 'worker') return;
    const { data, error } = await this.supabase.admin
      .from('worker_profiles')
      .select('review_status')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) this.fail('No se pudo verificar el perfil del trabajador.');
    if (data?.review_status !== 'approved') {
      throw new ForbiddenException('El perfil del trabajador debe estar aprobado para coordinar servicios.');
    }
  }

  private fail(message: string): never {
    throw new InternalServerErrorException(message);
  }
}

function parseSchedule(value: unknown): ScheduleInput {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('Indica la fecha y hora acordadas.');
  }
  const input = value as Record<string, unknown>;
  const startsAt = parseInstant(input['startsAt'], 'inicio');
  const endsAt = parseInstant(input['endsAt'], 'fin');
  if (Date.parse(startsAt) <= Date.now()) {
    throw new BadRequestException('El horario no puede estar en el pasado.');
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new BadRequestException('La hora de fin debe ser posterior al inicio.');
  }
  return { startsAt, endsAt };
}

function parseInstant(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new BadRequestException(`La fecha de ${label} debe incluir zona horaria.`);
  }
  const milliseconds = Date.parse(value);
  if (Number.isNaN(milliseconds)) {
    throw new BadRequestException(`La fecha de ${label} no es válida.`);
  }
  return new Date(milliseconds).toISOString();
}
