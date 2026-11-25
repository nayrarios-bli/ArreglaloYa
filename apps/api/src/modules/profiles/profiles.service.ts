import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { UpdateProfileDto } from './profiles.dto.js';

@Injectable()
export class ProfilesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getPublicProfile(id: string) {
    const { data: profile, error } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name, role, worker_profiles(bio, review_status), client_profiles(home_zone_id, service_zones(name, city))')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new InternalServerErrorException('No se pudo consultar el perfil.');
    if (!profile) throw new NotFoundException('No se encontró el perfil.');

    const worker = Array.isArray(profile.worker_profiles)
      ? profile.worker_profiles[0]
      : profile.worker_profiles;
    const client = Array.isArray(profile.client_profiles)
      ? profile.client_profiles[0]
      : profile.client_profiles;
    const zone = client?.service_zones;

    return {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
      ...(worker?.review_status === 'approved' ? { bio: worker.bio } : {}),
      ...(zone ? { zone: Array.isArray(zone) ? zone[0] : zone } : {}),
    };
  }

  async getPrivateAddress(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('client_profiles')
      .select('exact_address')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new InternalServerErrorException('No se pudo consultar la dirección.');
    if (!data) throw new NotFoundException('No existe un perfil de cliente para este usuario.');
    return { exactAddress: data.exact_address };
  }

  async getClientAddressForWorker(clientId: string, workerId: string) {
    const { data: service, error: serviceError } = await this.supabase.admin
      .from('services')
      .select('id')
      .eq('client_id', clientId)
      .eq('worker_id', workerId)
      .in('status', ['scheduled', 'in_progress'])
      .limit(1)
      .maybeSingle();

    if (serviceError) throw new InternalServerErrorException('No se pudo verificar el servicio.');
    if (!service) throw new ForbiddenException('La dirección solo está disponible para el trabajador asignado a un servicio activo.');

    const { data, error } = await this.supabase.admin
      .from('client_profiles')
      .select('exact_address')
      .eq('user_id', clientId)
      .maybeSingle();

    if (error) throw new InternalServerErrorException('No se pudo consultar la dirección.');
    if (!data) throw new NotFoundException('No se encontró la dirección del cliente.');
    return { exactAddress: data.exact_address };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const { data: profile, error: profileError } = await this.supabase.admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw new InternalServerErrorException('No se pudo consultar el perfil.');
    if (!profile) throw new NotFoundException('No se encontró el perfil.');

    if (profile.role === 'client' && dto.bio !== undefined) {
      throw new ForbiddenException('Los perfiles de cliente no pueden modificar la biografía de trabajador.');
    }
    if (profile.role === 'worker' && (dto.exactAddress !== undefined || dto.homeZoneId !== undefined)) {
      throw new ForbiddenException('Los perfiles de trabajador no pueden modificar campos de cliente.');
    }
    if (!['client', 'worker'].includes(profile.role) &&
      (dto.exactAddress !== undefined || dto.homeZoneId !== undefined || dto.bio !== undefined)) {
      throw new ForbiddenException('Este tipo de cuenta no puede modificar campos de cliente o trabajador.');
    }

    const profileChanges: { full_name?: string; phone?: string | null } = {};
    if (typeof dto.fullName === 'string') profileChanges.full_name = dto.fullName.trim();
    if (typeof dto.phone === 'string') profileChanges.phone = dto.phone.trim() || null;

    if (Object.keys(profileChanges).length > 0) {
      const { error } = await this.supabase.admin.from('profiles').update(profileChanges).eq('id', userId);
      if (error) throw new InternalServerErrorException('No se pudo actualizar el perfil.');
    }

    if (profile.role === 'client') {
      const clientChanges: { exact_address?: string | null; home_zone_id?: string | null } = {};
      if (typeof dto.exactAddress === 'string') clientChanges.exact_address = dto.exactAddress.trim() || null;
      if (typeof dto.homeZoneId === 'string') clientChanges.home_zone_id = dto.homeZoneId;
      if (Object.keys(clientChanges).length > 0) {
        const { error } = await this.supabase.admin
          .from('client_profiles')
          .update(clientChanges)
          .eq('user_id', userId);
        if (error) throw new InternalServerErrorException('No se pudo actualizar el perfil de cliente.');
      }
    } else if (profile.role === 'worker') {
      if (typeof dto.bio === 'string') {
        const { error } = await this.supabase.admin
          .from('worker_profiles')
          .update({ bio: dto.bio.trim() || null })
          .eq('user_id', userId);
        if (error) throw new InternalServerErrorException('No se pudo actualizar el perfil de trabajador.');
      }
    }

    return this.getPublicProfile(userId);
  }
}
