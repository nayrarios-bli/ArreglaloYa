import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  CatalogApiService,
  type CatalogZone,
} from '../../core/catalog-api.service';
import {
  ProfilesService,
  type PublicProfile,
  type UpdateProfilePayload,
} from './profiles.service';

@Component({
  selector: 'app-my-profile-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './my-profile.page.html',
  styleUrl: './my-profile.page.css',
})
export class MyProfilePage implements OnInit {
  private readonly profilesService = inject(ProfilesService);
  private readonly authService = inject(AuthService);
  private readonly catalogApi = inject(CatalogApiService);

  readonly user = this.authService.getUser();
  readonly role = this.user?.role ?? '';

  fullName = this.user?.fullName ?? '';
  phone = this.user?.phone ?? '';
  exactAddress = '';
  homeZoneId = '';
  bio = '';

  readonly profile = signal<PublicProfile | null>(null);
  readonly loadingProfile = signal(false);
  readonly profileError = signal('');
  readonly saving = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly zones = signal<CatalogZone[]>([]);
  readonly zonesUnavailable = signal(false);

  readonly address = signal<string | null>(null);
  readonly addressLoading = signal(false);
  readonly addressError = signal('');

  ngOnInit(): void {
    if (!this.user) {
      this.errorMessage.set(
        'No se encontró una sesión activa. Vuelve a iniciar sesión.',
      );
      return;
    }

    this.loadProfile();

    if (this.role === 'client') {
      this.loadZones();
      this.loadPrivateAddress();
    }
  }

  loadProfile(): void {
    if (!this.user) {
      return;
    }

    this.loadingProfile.set(true);
    this.profileError.set('');

    this.profilesService.getPublicProfile(this.user.id).subscribe({
      next: (profile) => {
        this.loadingProfile.set(false);
        this.profile.set(profile);

        if (profile.fullName) {
          this.fullName = profile.fullName;
        }

        if (this.role === 'worker') {
          this.bio = profile.bio ?? '';
        }
      },
      error: (error: unknown) => {
        this.loadingProfile.set(false);
        this.profileError.set(
          this.extractMessage(error, 'No se pudo cargar tu perfil.'),
        );
      },
    });
  }

  loadZones(): void {
    this.catalogApi.getZones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.zonesUnavailable.set(false);
      },
      error: () => {
        this.zonesUnavailable.set(true);
      },
    });
  }

  loadPrivateAddress(): void {
    if (this.addressLoading()) {
      return;
    }

    this.addressLoading.set(true);
    this.addressError.set('');
    this.address.set(null);

    this.profilesService.getMyPrivateAddress().subscribe({
      next: (response) => {
        this.addressLoading.set(false);
        this.address.set(response.exactAddress);
      },
      error: (error: unknown) => {
        this.addressLoading.set(false);
        this.addressError.set(
          this.extractMessage(error, 'No se pudo consultar tu dirección.'),
        );
      },
    });
  }

  save(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.saving()) {
      return;
    }

    if (!this.user) {
      this.errorMessage.set(
        'No se encontró una sesión activa. Vuelve a iniciar sesión.',
      );
      return;
    }

    const fullName = this.fullName.trim();
    if (fullName.length < 2) {
      this.errorMessage.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (fullName.length > 120) {
      this.errorMessage.set('El nombre no puede superar los 120 caracteres.');
      return;
    }

    const phone = this.phone.trim();
    if (phone.length > 30) {
      this.errorMessage.set('El teléfono no puede superar los 30 caracteres.');
      return;
    }

    const payload: UpdateProfilePayload = { fullName, phone };

    if (this.role === 'client') {
      const exactAddress = this.exactAddress.trim();
      if (exactAddress.length > 500) {
        this.errorMessage.set(
          'La dirección no puede superar los 500 caracteres.',
        );
        return;
      }

      payload.exactAddress = exactAddress;

      const homeZoneId = this.homeZoneId.trim();
      if (homeZoneId) {
        payload.homeZoneId = homeZoneId;
      }
    } else if (this.role === 'worker') {
      const bio = this.bio.trim();
      if (bio.length > 2000) {
        this.errorMessage.set(
          'La biografía no puede superar los 2000 caracteres.',
        );
        return;
      }

      payload.bio = bio;
    }

    this.saving.set(true);

    this.profilesService.updateMyProfile(payload).subscribe({
      next: (profile) => {
        this.saving.set(false);
        this.profile.set(profile);
        this.successMessage.set('Perfil actualizado correctamente.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(
          this.extractMessage(error, 'No se pudo actualizar el perfil.'),
        );
      },
    });
  }

  roleLabel(role: string): string {
    if (role === 'client') {
      return 'Cliente';
    }

    if (role === 'worker') {
      return 'Trabajador';
    }

    return role;
  }

  private extractMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con la API. Verifica que el servidor esté disponible.';
      }

      const message: unknown = error.error?.message;
      if (Array.isArray(message)) {
        return message.join(' ');
      }

      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      return fallback;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }
}
