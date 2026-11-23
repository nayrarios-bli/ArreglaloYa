import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth.service.js';
import {
  OffersApiService,
  type PublicWorkerProfile,
  type RequestOffer,
  type SelectedOffer,
} from '../offers-api.service.js';

@Component({
  selector: 'app-client-offers-page',
  standalone: true,
  templateUrl: './client-offers.page.html',
  styleUrl: './client-offers.page.css',
})
export class ClientOffersPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = inject(OffersApiService);

  private requestId: string | null = null;
  private accessToken: string | null = null;

  readonly offers = signal<RequestOffer[]>([]);
  readonly loading = signal(true);
  readonly selecting = signal(false);
  readonly error = signal('');
  readonly selected = signal<SelectedOffer | null>(null);
  readonly workerProfiles = signal<Record<string, PublicWorkerProfile | null>>({});

  ngOnInit(): void {
    this.requestId =
      this.route.snapshot.paramMap.get('requestId');
    this.accessToken = this.auth.getAccessToken();

    if (!this.requestId || !this.accessToken) {
      this.error.set(
        'No se pudo identificar la solicitud o tu sesión expiró.',
      );
      this.loading.set(false);
      return;
    }

    this.loadOffers();
  }

  selectOffer(offer: RequestOffer): void {
    if (!this.requestId || !this.accessToken || this.selecting()) {
      return;
    }

    const confirmed = window.confirm(
      '¿Quieres seleccionar esta oferta?',
    );

    if (!confirmed) {
      return;
    }

    this.error.set('');
    this.selecting.set(true);

    this.api
      .selectOffer(this.requestId, offer.id, this.accessToken)
      .subscribe({
        next: (result) => {
          this.selected.set(result);
          this.selecting.set(false);
          this.loadOffers();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.errorMessage(error));
          this.selecting.set(false);
        },
      });
  }

  private loadOffers(): void {
    if (!this.requestId || !this.accessToken) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.api
      .getOffersForRequest(this.requestId, this.accessToken)
      .subscribe({
        next: (offers) => {
          this.offers.set(offers);
          this.loading.set(false);
          for (const offer of offers) {
            this.api
              .getWorkerProfileForOffer(
                this.requestId!,
                offer.id,
                this.accessToken!,
              )
              .subscribe({
                next: (profile) =>
                  this.workerProfiles.update((profiles) => ({
                    ...profiles,
                    [offer.id]: profile,
                  })),
                error: () =>
                  this.workerProfiles.update((profiles) => ({
                    ...profiles,
                    [offer.id]: null,
                  })),
              });
          }
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  workerProfile(offerId: string): PublicWorkerProfile | null | undefined {
    return this.workerProfiles()[offerId];
  }

  specialtyNames(profile: PublicWorkerProfile): string {
    return profile.specialties.map((specialty) => specialty.name).join(', ');
  }

  zoneNames(profile: PublicWorkerProfile): string {
    return profile.serviceZones
      .map((zone) => `${zone.name}, ${zone.city}`)
      .join(' · ');
  }

  private errorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string' && message) {
      return message;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con la API.';
    }

    if (error.status === 401) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para revisar estas ofertas.';
    }

    if (error.status === 404) {
      return 'No se encontró la solicitud.';
    }

    return `No se pudo completar la operación (error ${error.status}).`;
  }
}
