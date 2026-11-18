import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './profiles.dto.js';
import { UserProfile } from './profiles.entity.js';

@Injectable()
export class ProfilesService {
  // Simulación de almacenamiento en memoria para perfiles (HU-25)
  private profiles: UserProfile[] = [
    {
      id: '1',
      userId: 'user-client-123',
      fullName: 'Carlos Pérez',
      role: 'CLIENT',
      publicLocation: 'Cochabamba, Centro',
      exactAddress: 'Av. Heroínas #452, Edificio Los Tiempos Piso 3',
      phone: '+59170000000',
    },
  ];

  findAll() {
    return this.profiles;
  }

  // HU-25: Obtener perfil público (Oculta la dirección exacta por privacidad)
  getPublicProfile(userId: string) {
    const profile = this.profiles.find((p) => p.userId === userId);
    if (!profile) {
      throw new NotFoundException('Perfil no encontrado.');
    }

    // Retornamos una versión segura sin la dirección exacta
    const { exactAddress, ...publicData } = profile;
    return {
      ...publicData,
      exactAddressProtected: '🔒 Oculta por seguridad hasta confirmar el servicio (HU-25)',
    };
  }

  // Obtener perfil completo (Solo para usuarios autorizados / servicio activo)
  getAuthorizedProfile(userId: string, hasActiveService: boolean) {
    const profile = this.profiles.find((p) => p.userId === userId);
    if (!profile) {
      throw new NotFoundException('Perfil no encontrado.');
    }

    if (!hasActiveService && profile.role === 'CLIENT') {
      const { exactAddress, ...publicData } = profile;
      return {
        ...publicData,
        exactAddressProtected: '🔒 Oculta por seguridad (requiere servicio activo)',
      };
    }

    return profile; // Muestra la dirección exacta si hay servicio activo
  }

  update(userId: string, updateProfileDto: UpdateProfileDto) {
    let profile = this.profiles.find((p) => p.userId === userId);
    if (!profile) {
      // Si no existe, lo creamos de manera simulada
      profile = {
        id: Date.now().toString(),
        userId,
        fullName: updateProfileDto.fullName || 'Usuario Nuevo',
        role: 'CLIENT',
        publicLocation: updateProfileDto.publicLocation || 'Cochabamba',
        exactAddress: updateProfileDto.exactAddress || '',
        phone: updateProfileDto.phone || '',
      };
      this.profiles.push(profile);
    } else {
      Object.assign(profile, updateProfileDto);
    }

    return {
      message: 'Perfil actualizado con éxito',
      profile,
    };
  }
}