
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ClientProfileService,
  ClientProfile as ClientProfileData,
  ServiceZone,
  UpdateClientProfileData,
} from '../../client-profile.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './client-profile.html',
  styleUrl: './client-profile.css',
})
export class ClientProfile implements OnInit {

  profile = signal<ClientProfileData | null>(null);
  zones = signal<ServiceZone[]>([]);

  loading = signal(true);
  saving = signal(false);
  editing = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  fullName = '';
  phone = '';
  homeZoneId = '';

  private originalData: UpdateClientProfileData = {};

  constructor(
    private readonly clientProfileService: ClientProfileService,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadZones();
  }

  // CONSULTAR PERFIL
  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.clientProfileService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.fullName = profile.fullName ?? '';
        this.phone = profile.phone ?? '';
        this.homeZoneId = profile.homeZoneId ?? '';

        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.message ||
          'No se pudo cargar el perfil del cliente.',
        );
        this.loading.set(false);
      },
    });
  }

  // CONSULTAR ZONAS
  loadZones(): void {
    this.clientProfileService.getZones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
      },
      error: () => {
        this.errorMessage.set(
          'No se pudieron cargar las zonas disponibles.',
        );
      },
    });
  }

  // ACTIVAR MODO EDICIÓN
  editProfile(): void {
    const profile = this.profile();

    if (!profile) {
      return;
    }

    this.originalData = {
      fullName: this.fullName,
      phone: this.phone,
      homeZoneId: this.homeZoneId,
    };

    this.errorMessage.set('');
    this.successMessage.set('');
    this.editing.set(true);
  }

  // CANCELAR EDICIÓN
  cancelEdit(): void {
    this.fullName = this.originalData.fullName ?? '';
    this.phone = this.originalData.phone ?? '';
    this.homeZoneId = this.originalData.homeZoneId ?? '';

    this.errorMessage.set('');
    this.successMessage.set('');
    this.editing.set(false);
  }

  // GUARDAR CAMBIOS
  saveProfile(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.fullName.trim()) {
      this.errorMessage.set('El nombre no puede estar vacío.');
      return;
    }

    if (this.fullName.trim().length < 3) {
      this.errorMessage.set(
        'El nombre debe tener al menos 3 caracteres.',
      );
      return;
    }

    if (!/^[0-9]{7,15}$/.test(this.phone.trim())) {
      this.errorMessage.set(
        'El celular debe contener entre 7 y 15 dígitos.',
      );
      return;
    }

    if (!this.homeZoneId) {
      this.errorMessage.set(
        'Debes seleccionar una zona de servicio.',
      );
      return;
    }

    const updateData: UpdateClientProfileData = {
      fullName: this.fullName.trim(),
      phone: this.phone.trim(),
      homeZoneId: this.homeZoneId,
    };

    this.saving.set(true);

    this.clientProfileService.updateProfile(updateData).subscribe({
      next: (profile) => {
        this.profile.set(profile);

        this.fullName = profile.fullName ?? '';
        this.phone = profile.phone ?? '';
        this.homeZoneId = profile.homeZoneId ?? '';

        this.successMessage.set(
          'Tu perfil se actualizó correctamente.',
        );

        this.editing.set(false);
        this.saving.set(false);
      },
      error: (error) => {
        const message = error.error?.message;

        this.errorMessage.set(
          Array.isArray(message)
            ? message.join(' ')
            : message || 'No se pudo actualizar el perfil.',
        );

        this.saving.set(false);
      },
    });
  }

  // OBTENER NOMBRE DE LA ZONA
  getZoneName(): string {
    const zone = this.zones().find(
      (item) => item.id === this.homeZoneId,
    );

    return zone
      ? `${zone.name}, ${zone.city}`
      : 'Zona no asignada';
  }
}
