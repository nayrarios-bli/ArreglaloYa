import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { CreateComplaintDto } from './complaints.dto.js';

const COMPLAINT_FIELDS = 'id, service_id, opened_by, description, status, assigned_to, resolution, created_at, updated_at';

@Injectable()
export class ComplaintsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(openedBy: string, dto: CreateComplaintDto) {
    const { data: service, error: serviceError } = await this.supabase.admin
      .from('services')
      .select('client_id, worker_id')
      .eq('id', dto.serviceId)
      .maybeSingle();

    if (serviceError) throw new InternalServerErrorException('No se pudo verificar el servicio.');
    if (!service) throw new NotFoundException('No se encontró el servicio.');
    if (openedBy !== service.client_id && openedBy !== service.worker_id) {
      throw new ForbiddenException('Solo un participante puede reclamar sobre este servicio.');
    }

    const { data, error } = await this.supabase.admin
      .from('complaints')
      .insert({ service_id: dto.serviceId, opened_by: openedBy, description: dto.description })
      .select(COMPLAINT_FIELDS)
      .single();

    if (error) throw new InternalServerErrorException('No se pudo registrar el reclamo.');
    return data;
  }

  async findMine(openedBy: string) {
    const { data, error } = await this.supabase.admin
      .from('complaints')
      .select(COMPLAINT_FIELDS)
      .eq('opened_by', openedBy)
      .order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('No se pudieron consultar tus reclamos.');
    return data ?? [];
  }

  async findAllForAdmin() {
    const { data, error } = await this.supabase.admin
      .from('complaints')
      .select(COMPLAINT_FIELDS)
      .order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException('No se pudieron consultar los reclamos.');
    return data ?? [];
  }
}
