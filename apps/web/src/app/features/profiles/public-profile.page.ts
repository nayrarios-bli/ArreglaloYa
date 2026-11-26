
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ProfilesService, type PublicProfile } from './profiles.service';

@Component({
  selector: 'app-public-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-profile.page.html',
  styleUrl: './public-profile.page.css',
})
export class PublicProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly profilesService = inject(ProfilesService);
  private readonly authService = inject(AuthService);

  readonly profile = signal<PublicProfile | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly isWorkerViewer = signal(false);
  readonly isOwnProfile = signal(false);

  readonly address = signal<string | null>(null);
  readonly addressLoading = signal(false);
  readonly addressError = signal('');

  private profileId = '';

  ngOnInit(): void {
    this.profileId = this.route.snapshot.paramMap.get('id') ?? '';

    const user = this.authService.getUser();
    this.isWorkerViewer.set(user?.role === 'worker');
    this.isOwnProfile.set(!!user && user.id === this.profileId);

    if (!this.profileId) {
      this.errorMessage.set('No se indicó el perfil a consultar.');
      return;
    }

    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.profilesService.getPublicProfile(this.profileId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.profile.set(null);
        this.loading.set(false);
        this.errorMessage.set(
          this.extractMessage(error, 'No se pudo cargar el perfil.'),
        );
      },
    });
  }

  canViewClientAddress(): boolean {
    return (
      this.isWorkerViewer() &&
      !this.isOwnProfile() &&
      this.profile()?.role === 'client'
    );
  }

  loadClientAddress(): void {
    if (!this.profileId || this.addressLoading()) {
      return;
    }

    this.addressLoading.set(true);
    this.addressError.set('');
    this.address.set(null);

    this.profilesService.getClientPrivateAddress(this.profileId).subscribe({
      next: (response) => {
        this.addressLoading.set(false);
        this.address.set(response.exactAddress);
      },
      error: (error: unknown) => {
        this.addressLoading.set(false);
        this.addressError.set(
          this.extractMessage(
            error,
            'No se pudo consultar la dirección del cliente.',
          ),
        );
      },
    });
  }

  roleLabel(role: string): string {
    if (role === 'client') return 'Cliente';
    if (role === 'worker') return 'Trabajador';
    return role;
  }

  weekdayLabel(weekday: number): string {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];

    return days[weekday] ?? 'Día no definido';
  }

  formatTime(time: string): string {
    return time.slice(0, 5);
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
