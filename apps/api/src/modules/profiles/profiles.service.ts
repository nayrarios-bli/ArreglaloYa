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
  const client = this.supabase.admin;

  // 1. Consultar los datos públicos básicos.
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', id)
    .maybeSingle();

  if (profileError) {
    console.error('ERROR AL CONSULTAR PERFIL:', profileError);
    throw new InternalServerErrorException(
      'No se pudo consultar el perfil.',
    );
  }

  if (!profile) {
    throw new NotFoundException('No se encontró el perfil.');
  }

  const publicProfile = {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
  };

  // 2. Si no es trabajador, devolver únicamente sus datos básicos.
  if (profile.role !== 'worker') {
    return publicProfile;
  }

  // 3. Consultar el perfil profesional del trabajador.
  const { data: worker, error: workerError } = await client
    .from('worker_profiles')
    .select('bio, review_status')
    .eq('user_id', id)
    .maybeSingle();

  if (workerError) {
    console.error('ERROR AL CONSULTAR PERFIL PROFESIONAL:', workerError);
    throw new InternalServerErrorException(
      'No se pudo consultar el perfil profesional.',
    );
  }

  if (!worker || worker.review_status !== 'approved') {
    return publicProfile;
  }

  // 4. Consultar especialidades, zonas, horarios y reseñas.
  const [
    workerCategories,
    workerZones,
    availability,
    reviews,
  ] = await Promise.all([
    client
      .from('worker_categories')
      .select('category_id')
      .eq('worker_id', id),

    client
      .from('worker_zones')
      .select('zone_id')
      .eq('worker_id', id),

    client
      .from('worker_availability')
      .select('weekday, starts_at, ends_at')
      .eq('worker_id', id)
      .order('weekday'),

    client
      .from('reviews')
      .select('score, comment, created_at')
      .eq('subject_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (
    workerCategories.error ||
    workerZones.error ||
    availability.error ||
    reviews.error
  ) {
    console.error('ERROR AL CONSULTAR INFORMACIÓN PROFESIONAL:', {
      categories: workerCategories.error,
      zones: workerZones.error,
      availability: availability.error,
      reviews: reviews.error,
    });

    throw new InternalServerErrorException(
      'No se pudo consultar toda la información del trabajador.',
    );
  }

  // 5. Obtener los nombres de las especialidades.
  const categoryIds =
    workerCategories.data?.map((item) => item.category_id) ?? [];

  let specialties: { id: string; name: string }[] = [];

  if (categoryIds.length > 0) {
    const { data, error } = await client
      .from('categories')
      .select('id, name')
      .in('id', categoryIds)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('ERROR AL CONSULTAR ESPECIALIDADES:', error);
      throw new InternalServerErrorException(
        'No se pudieron consultar las especialidades.',
      );
    }

    specialties = data ?? [];
  }

  // 6. Obtener los nombres de las zonas de servicio.
  const zoneIds =
    workerZones.data?.map((item) => item.zone_id) ?? [];

  let serviceZones: {
    id: string;
    name: string;
    city: string;
  }[] = [];

  if (zoneIds.length > 0) {
    const { data, error } = await client
      .from('service_zones')
      .select('id, name, city')
      .in('id', zoneIds)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('ERROR AL CONSULTAR ZONAS:', error);
      throw new InternalServerErrorException(
        'No se pudieron consultar las zonas de servicio.',
      );
    }

    serviceZones = data ?? [];
  }

  // 7. Calcular la calificación promedio.
  const reviewItems = reviews.data ?? [];

  const averageRating =
    reviewItems.length > 0
      ? Math.round(
          (reviewItems.reduce((sum, review) => sum + review.score, 0) /
            reviewItems.length) *
            10,
        ) / 10
      : null;

  // 8. Devolver el perfil público completo.
  return {
    ...publicProfile,
    bio: worker.bio,
    specialties,
    serviceZones,
    availability: (availability.data ?? []).map((item) => ({
      weekday: item.weekday,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
    })),
    averageRating,
    reviewCount: reviewItems.length,
    reviews: reviewItems.map((review) => ({
      score: review.score,
      comment: review.comment,
      createdAt: review.created_at,
    })),
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
