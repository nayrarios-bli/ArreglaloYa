
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../database/supabase.service.js';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto.js';

@Injectable()
export class WorkersService {
  constructor(private readonly supabase: SupabaseService) {}

  // CONSULTAR PERFIL COMPLETO
  async getProfile(workerId: string) {
    const client = this.supabase.admin;

    const { data: profile, error } = await client
      .from('worker_profiles')
      .select('user_id, bio, review_status')
      .eq('user_id', workerId)
      .maybeSingle();

    if (error) this.fail('No se pudo consultar el perfil.');
    if (!profile) {
      throw new NotFoundException('No se encontró el perfil del trabajador.');
    }

    const [categories, zones, availability] = await Promise.all([
      client
        .from('worker_categories')
        .select('category_id')
        .eq('worker_id', workerId),

      client
        .from('worker_zones')
        .select('zone_id')
        .eq('worker_id', workerId),

      client
        .from('worker_availability')
        .select('id, weekday, starts_at, ends_at')
        .eq('worker_id', workerId)
        .order('weekday'),
    ]);

    if (categories.error || zones.error || availability.error) {
      this.fail('No se pudo consultar toda la información del trabajador.');
    }

    return {
      ...profile,
      categoryIds: categories.data?.map((item) => item.category_id) ?? [],
      zoneIds: zones.data?.map((item) => item.zone_id) ?? [],
      availability: availability.data ?? [],
    };
  }

  // ACTUALIZAR PERFIL
  async updateProfile(
    workerId: string,
    input: UpdateWorkerProfileDto,
  ) {
    const client = this.supabase.admin;

    const { data: profile, error: profileError } = await client
      .from('worker_profiles')
      .select('user_id')
      .eq('user_id', workerId)
      .maybeSingle();

    if (profileError) this.fail('No se pudo verificar el perfil.');
    if (!profile) {
      throw new NotFoundException('No se encontró el perfil del trabajador.');
    }

    // Validar horarios
    if (input.availability !== undefined) {
      const weekdays = input.availability.map((schedule) => schedule.weekday);
      if (new Set(weekdays).size !== weekdays.length) {
        throw new BadRequestException(
          'Solo puedes registrar un horario por día de la semana.',
        );
      }

      for (const schedule of input.availability) {
        if (schedule.endsAt <= schedule.startsAt) {
          throw new BadRequestException(
            'La hora de finalización debe ser posterior a la hora de inicio.',
          );
        }
      }
    }

    // Validar categorías activas
    if (input.categoryIds !== undefined && input.categoryIds.length > 0) {
      const { data, error } = await client
        .from('categories')
        .select('id')
        .in('id', input.categoryIds)
        .eq('is_active', true);

      if (error) this.fail('No se pudieron verificar las especialidades.');

      if (data?.length !== input.categoryIds.length) {
        throw new BadRequestException(
          'Una o más especialidades no están disponibles.',
        );
      }
    }

    // Validar zonas activas
    if (input.zoneIds !== undefined && input.zoneIds.length > 0) {
      const { data, error } = await client
        .from('service_zones')
        .select('id')
        .in('id', input.zoneIds)
        .eq('is_active', true);

      if (error) this.fail('No se pudieron verificar las zonas.');

      if (data?.length !== input.zoneIds.length) {
        throw new BadRequestException(
          'Una o más zonas no están disponibles.',
        );
      }
    }

    // Actualizar biografía
    if (input.bio !== undefined) {
      const { error } = await client
        .from('worker_profiles')
        .update({ bio: input.bio.trim() || null })
        .eq('user_id', workerId);

      if (error) this.fail('No se pudo actualizar la biografía.');
    }

    // Actualizar especialidades
    if (input.categoryIds !== undefined) {
      const { error: deleteError } = await client
        .from('worker_categories')
        .delete()
        .eq('worker_id', workerId);

      if (deleteError) this.fail('No se pudieron actualizar las especialidades.');

      if (input.categoryIds.length > 0) {
        const { error: insertError } = await client
          .from('worker_categories')
          .insert(
            input.categoryIds.map((categoryId) => ({
              worker_id: workerId,
              category_id: categoryId,
            })),
          );

        if (insertError) this.fail('No se pudieron guardar las especialidades.');
      }
    }

    // Actualizar zonas
    if (input.zoneIds !== undefined) {
      const { error: deleteError } = await client
        .from('worker_zones')
        .delete()
        .eq('worker_id', workerId);

      if (deleteError) this.fail('No se pudieron actualizar las zonas.');

      if (input.zoneIds.length > 0) {
        const { error: insertError } = await client
          .from('worker_zones')
          .insert(
            input.zoneIds.map((zoneId) => ({
              worker_id: workerId,
              zone_id: zoneId,
            })),
          );

        if (insertError) this.fail('No se pudieron guardar las zonas.');
      }
    }

    // Actualizar horarios
    if (input.availability !== undefined) {
      const { error: deleteError } = await client
        .from('worker_availability')
        .delete()
        .eq('worker_id', workerId);

      if (deleteError) this.fail('No se pudieron actualizar los horarios.');

      if (input.availability.length > 0) {
        const { error: insertError } = await client
          .from('worker_availability')
          .insert(
            input.availability.map((schedule) => ({
              worker_id: workerId,
              weekday: schedule.weekday,
              starts_at: schedule.startsAt,
              ends_at: schedule.endsAt,
            })),
          );

        if (insertError) this.fail('No se pudieron guardar los horarios.');
      }
    }

    return this.getProfile(workerId);
  }

  // ENVIAR PERFIL A REVISIÓN
  async submitForReview(workerId: string) {
    const client = this.supabase.admin;

    const profile = await this.getProfile(workerId);

    if (profile.review_status === 'approved') {
      throw new ConflictException(
        'Tu perfil ya fue aprobado.',
      );
    }

    if (!profile.bio?.trim()) {
      throw new BadRequestException('Completa tu biografía antes de enviar el perfil.');
    }

    if (profile.categoryIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una especialidad.');
    }

    if (profile.zoneIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una zona de atención.');
    }

    if (profile.availability.length === 0) {
      throw new BadRequestException('Registra al menos un horario disponible.');
    }

    const { error } = await client
      .from('worker_profiles')
      .update({
        review_status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
      })
      .eq('user_id', workerId);

    if (error) this.fail('No se pudo enviar el perfil a revisión.');

    return {
      message: 'Tu perfil fue enviado a revisión correctamente.',
      reviewStatus: 'pending',
    };
  }

  private fail(message: string): never {
    throw new InternalServerErrorException(message);
  }
}
