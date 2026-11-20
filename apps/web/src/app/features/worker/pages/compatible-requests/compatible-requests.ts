import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import {
  CompatibleRequestsApiService,
  type CompatibleRequest,
} from './compatible-requests-api.service';

@Component({
  selector: 'app-compatible-requests',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './compatible-requests.html',
  styleUrl: './compatible-requests.css',
})
export class CompatibleRequests implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(CompatibleRequestsApiService);

  readonly requests = signal<CompatibleRequest[]>([]);
  readonly profileReady = signal(true);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    const accessToken = this.auth.getAccessToken();
    if (!accessToken) {
      this.loading.set(false);
      this.error.set('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.api.list(accessToken).subscribe({
      next: ({ profileReady, requests }) => {
        this.profileReady.set(profileReady);
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  availability(request: CompatibleRequest): string {
    if (!request.available_from && !request.available_until) {
      return 'Horario por coordinar';
    }
    if (!request.available_from) {
      return `Disponible hasta ${this.formatDate(request.available_until!)}`;
    }
    if (!request.available_until) {
      return `Disponible desde ${this.formatDate(request.available_from)}`;
    }
    return `${this.formatDate(request.available_from)} – ${this.formatDate(request.available_until)}`;
  }

  private errorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message) return message;
    if (error.status === 0) return 'No se pudo conectar con la API. Comprueba que NestJS esté ejecutándose.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (error.status === 403) return 'Tu perfil debe estar aprobado para consultar solicitudes.';
    return `No se pudieron cargar las solicitudes (error ${error.status}).`;
  }
}
