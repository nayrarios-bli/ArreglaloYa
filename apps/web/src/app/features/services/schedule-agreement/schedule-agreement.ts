import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ScheduleApiService, type ScheduledService } from './schedule-api.service';

@Component({
  selector: 'app-schedule-agreement',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './schedule-agreement.html',
  styleUrl: './schedule-agreement.css',
})
export class ScheduleAgreement implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ScheduleApiService);
  private readonly route = inject(ActivatedRoute);

  readonly services = signal<ScheduledService[]>([]);
  readonly selectedId = signal('');
  readonly selected = computed(
    () => this.services().find((service) => service.id === this.selectedId()) ?? null,
  );
  readonly start = signal('');
  readonly end = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  ngOnInit(): void {
    const token = this.auth.getAccessToken();
    if (!token) {
      this.loading.set(false);
      this.error.set('Tu sesión expiró. Inicia sesión para continuar.');
      return;
    }

    this.api.list(token).subscribe({
      next: ({ services }) => {
        this.services.set(services);
        const requestedId = this.route.snapshot.paramMap.get('serviceId') ?? '';
        this.selectedId.set(services.some((service) => service.id === requestedId)
          ? requestedId
          : services[0]?.id ?? '');
        this.syncFields();
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  chooseService(id: string): void {
    this.selectedId.set(id);
    this.error.set('');
    this.success.set('');
    this.syncFields();
  }

  saveSchedule(event: Event): void {
    event.preventDefault();
    const service = this.selected();
    const token = this.auth.getAccessToken();
    if (!service || !token) {
      this.error.set('No se encontró el servicio o tu sesión expiró.');
      return;
    }
    if (!this.start() || !this.end()) {
      this.error.set('Selecciona la fecha y hora de inicio y fin.');
      return;
    }

    const startsAt = new Date(this.start());
    const endsAt = new Date(this.end());
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      this.error.set('Revisa las fechas seleccionadas.');
      return;
    }
    if (startsAt <= new Date()) {
      this.error.set('El horario debe ser futuro.');
      return;
    }
    if (endsAt <= startsAt) {
      this.error.set('La hora de fin debe ser posterior al inicio.');
      return;
    }

    this.error.set('');
    this.success.set('');
    this.saving.set(true);
    this.api.save(service.id, startsAt.toISOString(), endsAt.toISOString(), token).subscribe({
      next: (updated) => {
        this.services.update((items) => items.map((item) => item.id === updated.id
          ? { ...item, scheduled_start: updated.scheduled_start, scheduled_end: updated.scheduled_end }
          : item));
        this.syncFields();
        this.success.set('Horario registrado. Ambas partes pueden consultarlo en Mis servicios.');
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errorMessage(error));
        this.saving.set(false);
      },
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private syncFields(): void {
    const service = this.selected();
    this.start.set(service?.scheduled_start ? toLocalInput(service.scheduled_start) : '');
    this.end.set(service?.scheduled_end ? toLocalInput(service.scheduled_end) : '');
  }

  private errorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message) return message;
    if (error.status === 0) return 'No se pudo conectar con la API. Comprueba que NestJS esté ejecutándose.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    return `No se pudo guardar el horario (error ${error.status}).`;
  }
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
