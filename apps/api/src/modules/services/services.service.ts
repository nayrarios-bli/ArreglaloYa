import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';

@Injectable()
export class ServicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async listMine(userId: string) {
    const db = this.supabase.admin;
    const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', userId).single();
    if (profileError || !profile || !['client', 'worker'].includes(profile.role)) throw new NotFoundException('No se encontró el perfil.');
    const ownerColumn = profile.role === 'client' ? 'client_id' : 'worker_id';
    const { data: rows, error } = await db.from('services').select('id, request_id, client_id, worker_id, status, created_at, started_at, completed_at').eq(ownerColumn, userId).order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('No se pudieron consultar los servicios.');
    const ids = (rows ?? []).map((row) => row.id);
    if (!ids.length) return [];
    const requestIds = (rows ?? []).map((row) => row.request_id);
    const counterpartIds = [...new Set((rows ?? []).map((row) => profile.role === 'client' ? row.worker_id : row.client_id))];
    const [requests, events, counterpartProfiles] = await Promise.all([
      db.from('repair_requests').select('id, title, category_id').in('id', requestIds),
      db.from('service_events').select('service_id, event_type, created_at').in('service_id', ids).order('created_at', { ascending: true }),
      db.from('profiles').select('id, phone').in('id', counterpartIds),
    ]);
    if (requests.error || events.error || counterpartProfiles.error) throw new InternalServerErrorException('No se pudo cargar el historial de servicios.');
    const requestMap = new Map((requests.data ?? []).map((r) => [r.id, r]));
    const categoryIds = [...new Set((requests.data ?? []).map((r) => r.category_id).filter(Boolean))];
    const { data: categories, error: categoriesError } = categoryIds.length
      ? await db.from('categories').select('id, name').in('id', categoryIds)
      : { data: [], error: null };
    if (categoriesError) throw new InternalServerErrorException('No se pudieron consultar las categorías.');
    const categoryMap = new Map((categories ?? []).map((category) => [category.id, category.name]));
    const eventMap = new Map<string, { status: string; at: string }[]>();
    for (const event of events.data ?? []) {
      const list = eventMap.get(event.service_id) ?? [];
      list.push({ status: event.event_type, at: event.created_at });
      eventMap.set(event.service_id, list);
    }
    const contacts = new Map((counterpartProfiles.data ?? []).map((p) => [p.id, p.phone]));
    return (rows ?? []).map((row) => ({ ...row, title: requestMap.get(row.request_id)?.title ?? 'Servicio', category: categoryMap.get(requestMap.get(row.request_id)?.category_id ?? '') ?? 'Servicio', contact_phone: contacts.get(profile.role === 'client' ? row.worker_id : row.client_id) ?? null, history: eventMap.get(row.id)?.length ? eventMap.get(row.id) : [{ status: 'scheduled', at: row.created_at }] }));
  }

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
