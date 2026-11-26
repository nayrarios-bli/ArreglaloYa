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
type ActiveServiceStatus = 'scheduled' | 'in_progress';

interface ScheduleInput {
  startsAt: string;
  endsAt: string;
}

interface ParticipantService {
  id: string;
  client_id: string;
  worker_id: string;
  status: string;
}

interface AvailabilityRow {
  starts_at: string;
  ends_at: string;
}

interface OccupiedRow {
  id: string;
  status: ActiveServiceStatus;
  scheduled_start: string;
  scheduled_end: string;
}

interface Interval {
  start: number;
  end: number;
}

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
}

const DEFAULT_TIME_ZONE = 'America/La_Paz';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE_SERVICE_STATUSES: ActiveServiceStatus[] = ['scheduled', 'in_progress'];

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

  async getAvailability(
    serviceId: string,
    userId: string,
    role: AppRole,
    dateValue: string,
  ) {
    const participantRole = this.getParticipantRole(role);
    await this.ensureWorkerApproved(userId, participantRole);
    const service = await this.getParticipantService(serviceId, userId, participantRole);
    if (service.status !== 'scheduled' && service.status !== 'in_progress') {
      throw new ConflictException('Solo se puede consultar la disponibilidad de un servicio activo.');
    }

    const date = parseDate(dateValue);
    const timeZone = getTimeZone();
    const dayStart = zonedDateTimeToUtc(date.value, '00:00', timeZone);
    const dayEnd = zonedDateTimeToUtc(addDays(date.value, 1), '00:00', timeZone);

    const [availabilityResult, occupiedResult] = await Promise.all([
      this.supabase.admin
        .from('worker_availability')
        .select('starts_at, ends_at')
        .eq('worker_id', service.worker_id)
        .eq('weekday', date.weekday)
        .order('starts_at', { ascending: true }),

      this.supabase.admin
        .from('services')
        .select('id, status, scheduled_start, scheduled_end')
        .eq('worker_id', service.worker_id)
        .in('status', ACTIVE_SERVICE_STATUSES)
        .neq('id', serviceId)
        .lt('scheduled_start', dayEnd.toISOString())
        .gt('scheduled_end', dayStart.toISOString())
        .order('scheduled_start', { ascending: true }),
    ]);

    if (availabilityResult.error) {
      this.fail('No se pudo consultar la disponibilidad del trabajador.');
    }
    if (occupiedResult.error) {
      this.fail('No se pudieron consultar los servicios ocupados.');
    }

    const availability = mergeIntervals(
      ((availabilityResult.data ?? []) as AvailabilityRow[])
        .map((row) => toInterval(date.value, row, timeZone))
        .filter((interval): interval is Interval => interval !== null),
    );

    const occupied = ((occupiedResult.data ?? []) as OccupiedRow[])
      .filter((row) => row.scheduled_start && row.scheduled_end)
      .map((row) => ({
        id: row.id,
        status: row.status,
        startsAt: row.scheduled_start,
        endsAt: row.scheduled_end,
        interval: {
          start: Date.parse(row.scheduled_start),
          end: Date.parse(row.scheduled_end),
        },
      }))
      .filter((row) => Number.isFinite(row.interval.start) && Number.isFinite(row.interval.end));

    const now = Date.now();
    const earliest = Math.ceil(now / 60_000) * 60_000;
    const available = subtractIntervals(
      availability,
      occupied.map((row) => row.interval),
    )
      .map((interval) => ({
        start: Math.max(interval.start, earliest),
        end: interval.end,
      }))
      .filter((interval) => interval.end > interval.start);

    return {
      serviceId: service.id,
      workerId: service.worker_id,
      date: date.value,
      weekday: date.weekday,
      timeZone,
      availability: availability.map(toAvailabilityWindow),
      occupied: occupied.map(({ id, status, startsAt, endsAt }) => ({
        id,
        status,
        startsAt,
        endsAt,
      })),
      available: available.map(toAvailabilityWindow),
    };
  }

  async updateSchedule(serviceId: string, userId: string, role: AppRole, value: unknown) {
    const participantRole = this.getParticipantRole(role);
    await this.ensureWorkerApproved(userId, participantRole);
    const input = parseSchedule(value);
    const service = await this.getParticipantService(serviceId, userId, participantRole);

    if (service.status !== 'scheduled') {
      throw new ConflictException('Solo se puede coordinar el horario de un servicio programado.');
    }

    await this.ensureWorkerAvailability(service.worker_id, input);

    const { data: overlap, error: overlapError } = await this.supabase.admin
      .from('services')
      .select('id')
      .eq('worker_id', service.worker_id)
      .in('status', ACTIVE_SERVICE_STATUSES)
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

  private async getParticipantService(
    serviceId: string,
    userId: string,
    participantRole: ParticipantRole,
  ): Promise<ParticipantService> {
    const { data: service, error } = await this.supabase.admin
      .from('services')
      .select('id, client_id, worker_id, status')
      .eq('id', serviceId)
      .maybeSingle();
    if (error) this.fail('No se pudo consultar el servicio.');
    if (!service) throw new NotFoundException('No se encontró el servicio.');

    const isParticipant = participantRole === 'client'
      ? service.client_id === userId
      : service.worker_id === userId;
    if (!isParticipant) throw new NotFoundException('No se encontró el servicio.');
    return service as ParticipantService;
  }

  private async ensureWorkerAvailability(workerId: string, input: ScheduleInput) {
    const timeZone = getTimeZone();
    const startDate = dateKeyInTimeZone(new Date(input.startsAt), timeZone);
    const endDate = dateKeyInTimeZone(new Date(input.endsAt), timeZone);

    if (startDate !== endDate) {
      throw new ConflictException(
        'El horario debe estar dentro de una misma franja de disponibilidad del trabajador.',
      );
    }

    const { data, error } = await this.supabase.admin
      .from('worker_availability')
      .select('starts_at, ends_at')
      .eq('worker_id', workerId)
      .eq('weekday', weekdayOf(startDate))
      .order('starts_at', { ascending: true });
    if (error) this.fail('No se pudo validar la disponibilidad del trabajador.');

    const startsAt = Date.parse(input.startsAt);
    const endsAt = Date.parse(input.endsAt);
    const windows = mergeIntervals(
      ((data ?? []) as AvailabilityRow[])
        .map((row) => toInterval(startDate, row, timeZone))
        .filter((interval): interval is Interval => interval !== null),
    );
    const fits = windows.some((window) => startsAt >= window.start && endsAt <= window.end);

    if (!fits) {
      throw new ConflictException(
        'El horario está fuera de la disponibilidad registrada por el trabajador. Elige una franja disponible.',
      );
    }
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

function parseDate(value: string) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BadRequestException('La fecha debe tener el formato YYYY-MM-DD.');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new BadRequestException('La fecha indicada no es válida.');
  }
  return { value, weekday: date.getUTCDay() };
}

function getTimeZone(): string {
  return process.env.WORKER_TIMEZONE?.trim() || DEFAULT_TIME_ZONE;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second] = parseTime(time);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = timeZoneOffset(new Date(wallClock), timeZone);
  let timestamp = wallClock - firstOffset;
  const secondOffset = timeZoneOffset(new Date(timestamp), timeZone);
  if (secondOffset !== firstOffset) timestamp = wallClock - secondOffset;
  return new Date(timestamp);
}

function timeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.get('year')),
    Number(values.get('month')) - 1,
    Number(values.get('day')),
    Number(values.get('hour')),
    Number(values.get('minute')),
    Number(values.get('second')),
  );
  return asUtc - date.getTime();
}

function parseTime(value: string): [number, number, number] {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) {
    throw new InternalServerErrorException('La disponibilidad del trabajador no es válida.');
  }
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? '0')];
}

function toInterval(
  date: string,
  row: AvailabilityRow,
  timeZone: string,
): Interval | null {
  try {
    const start = zonedDateTimeToUtc(date, row.starts_at, timeZone).getTime();
    const end = zonedDateTimeToUtc(date, row.ends_at, timeZone).getTime();
    return end > start ? { start, end } : null;
  } catch {
    return null;
  }
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
      continue;
    }
    previous.end = Math.max(previous.end, interval.end);
  }
  return merged;
}

function subtractIntervals(windows: Interval[], blocks: Interval[]): Interval[] {
  let result = windows.map((window) => ({ ...window }));
  for (const block of blocks) {
    const next: Interval[] = [];
    for (const window of result) {
      if (block.end <= window.start || block.start >= window.end) {
        next.push(window);
        continue;
      }
      if (block.start > window.start) {
        next.push({ start: window.start, end: Math.min(block.start, window.end) });
      }
      if (block.end < window.end) {
        next.push({ start: Math.max(block.end, window.start), end: window.end });
      }
    }
    result = next;
  }
  return result.filter((interval) => interval.end > interval.start);
}

function toAvailabilityWindow(interval: Interval): AvailabilityWindow {
  return {
    startsAt: new Date(interval.start).toISOString(),
    endsAt: new Date(interval.end).toISOString(),
  };
}
