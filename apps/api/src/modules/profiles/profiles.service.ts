import { Injectable } from '@nestjs/common';
import { UpdateProfileDto } from './profiles.dto.js';
import { Profile } from './profiles.entity.js';

@Injectable()
export class ProfilesService {
  private profiles: Profile[] = [];

  getPublicProfile(id: string): Partial<Profile> {
    const profile = this.profiles.find((p) => p.id === id) || {
      id,
      fullName: 'Usuario ArreglaloYa',
      city: 'Cochabamba',
    };

    // HU-25: Ocultar o enmascarar la dirección exacta y datos sensibles para terceros
    const { exactAddress, phone, ...publicData } = profile;
    return {
      ...publicData,
      exactAddress: '*** Dirección protegida hasta aceptar servicio ***',
    };
  }

  update(id: string, dto: UpdateProfileDto): Profile {
    let profile = this.profiles.find((p) => p.id === id);
    if (!profile) {
      profile = { id, userId: id, fullName: '', phone: '', exactAddress: '', city: 'Cochabamba', updatedAt: new Date() };
      this.profiles.push(profile);
    }
    Object.assign(profile, dto, { updatedAt: new Date() });
    return profile;
  }
}