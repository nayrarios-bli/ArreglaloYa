
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../database/supabase.service.js';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto.js';

@Injectable()
export class ClientProfileService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  // CONSULTAR PERFIL DEL CLIENTE
  async getProfile(userId: string) {
    const { data: profile, error: profileError } =
      await this.supabaseService.admin
        .from('profiles')
        .select('id, full_name, phone, role')
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
      throw new NotFoundException(
        'No se encontró el perfil del cliente.',
      );
    }

    if (profile.role !== 'client') {
      throw new BadRequestException(
        'El usuario no tiene un perfil de cliente.',
      );
    }

    const { data: clientProfile, error: clientError } =
      await this.supabaseService.admin
        .from('client_profiles')
        .select('home_zone_id')
        .eq('user_id', userId)
        .single();

    if (clientError || !clientProfile) {
      throw new NotFoundException(
        'No se encontró el perfil del cliente.',
      );
    }

    return {
      id: profile.id,
      fullName: profile.full_name,
      phone: profile.phone,
      role: profile.role,
      homeZoneId: clientProfile.home_zone_id,
    };
  }

  // CONSULTAR ZONAS ACTIVAS
  async getZones() {
    const { data, error } =
      await this.supabaseService.admin
        .from('service_zones')
        .select('id, name, city')
        .eq('is_active', true)
        .order('name');

    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las zonas disponibles.',
      );
    }

    return data;
  }

  // ACTUALIZAR PERFIL DEL CLIENTE
  async updateProfile(
    userId: string,
    updateDto: UpdateClientProfileDto,
  ) {
    const hasData = Object.values(updateDto).some(
      (value) => value !== undefined,
    );

    if (!hasData) {
      throw new BadRequestException(
        'Debes proporcionar al menos un dato para actualizar.',
      );
    }

    // Comprobar que el usuario sea cliente.
    const { data: profile, error: profileError } =
      await this.supabaseService.admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== 'client'
    ) {
      throw new BadRequestException(
        'No se encontró un perfil de cliente válido.',
      );
    }

    // Comprobar que exista el perfil del cliente.
    const { data: clientProfile, error: clientError } =
      await this.supabaseService.admin
        .from('client_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

    if (clientError || !clientProfile) {
      throw new NotFoundException(
        'No se encontró el perfil del cliente.',
      );
    }

    // Validar que la zona exista y esté activa.
    if (updateDto.homeZoneId !== undefined) {
      const { data: zone, error: zoneError } =
        await this.supabaseService.admin
          .from('service_zones')
          .select('id')
          .eq('id', updateDto.homeZoneId)
          .eq('is_active', true)
          .single();

      if (zoneError || !zone) {
        throw new BadRequestException(
          'La zona seleccionada no existe o no está disponible.',
        );
      }
    }

    // Validar nombre.
    if (
      updateDto.fullName !== undefined &&
      !updateDto.fullName.trim()
    ) {
      throw new BadRequestException(
        'El nombre no puede estar vacío.',
      );
    }

    // Validar celular.
    if (
      updateDto.phone !== undefined &&
      !updateDto.phone.trim()
    ) {
      throw new BadRequestException(
        'El celular no puede estar vacío.',
      );
    }

    // Preparar actualización de datos personales.
    const profileUpdates: {
      full_name?: string;
      phone?: string;
    } = {};

    if (updateDto.fullName !== undefined) {
      profileUpdates.full_name = updateDto.fullName.trim();
    }

    if (updateDto.phone !== undefined) {
      profileUpdates.phone = updateDto.phone.trim();
    }

    // Actualizar datos personales.
    if (Object.keys(profileUpdates).length > 0) {
      const { error } =
        await this.supabaseService.admin
          .from('profiles')
          .update({
            ...profileUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

      if (error) {
        throw new InternalServerErrorException(
          'No se pudieron actualizar los datos personales.',
        );
      }
    }

    // Actualizar zona del cliente.
    if (updateDto.homeZoneId !== undefined) {
      const { error } =
        await this.supabaseService.admin
          .from('client_profiles')
          .update({
            home_zone_id: updateDto.homeZoneId,
          })
          .eq('user_id', userId);

      if (error) {
        throw new InternalServerErrorException(
          'No se pudo actualizar la zona del cliente.',
        );
      }
    }

    // Devolver el perfil actualizado.
    return this.getProfile(userId);
  }
}
