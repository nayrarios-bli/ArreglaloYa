import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { OfferFormComponent } from '../../../offers/offer-form.component';
import {
  CompatibleRequestsApiService,
  type CompatibleRequestDetail,
} from './compatible-requests-api.service';

@Component({
  selector: 'app-compatible-request-detail',
  standalone: true,
  imports: [RouterLink, OfferFormComponent],
  templateUrl: './request-detail.html',
  styleUrl: './request-detail.css',
})
export class CompatibleRequestDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = inject(CompatibleRequestsApiService);

  readonly request = signal<CompatibleRequestDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly accessToken = signal<string | null>(null);
  readonly offerSubmitted = signal(false);

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('requestId');
    const accessToken = this.auth.getAccessToken();
    if (!requestId || !accessToken) {
      this.loading.set(false);
      this.error.set('No se pudo identificar la solicitud o tu sesión expiró.');
      return;
    }
    this.accessToken.set(accessToken);

    this.api.getDetail(requestId, accessToken).subscribe({
      next: (request) => {
        this.request.set(request);
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

  availability(request: CompatibleRequestDetail): string {
    if (!request.available_from && !request.available_until) return 'Horario por coordinar';
    if (!request.available_from) return `Hasta ${this.formatDate(request.available_until!)}`;
    if (!request.available_until) return `Desde ${this.formatDate(request.available_from)}`;
    return `${this.formatDate(request.available_from)} – ${this.formatDate(request.available_until)}`;
  }

  markOfferSubmitted(): void {
    this.offerSubmitted.set(true);
  }

  private errorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message) return message;
    if (error.status === 0) return 'No se pudo conectar con la API. Comprueba que NestJS esté ejecutándose.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (error.status === 403) return 'Tu perfil debe estar aprobado para consultar solicitudes.';
    if (error.status === 404) return 'La solicitud ya no está disponible o no coincide con tu perfil.';
    return `No se pudo cargar la solicitud (error ${error.status}).`;
  }
}
