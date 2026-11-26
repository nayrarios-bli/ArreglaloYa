import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import {
  ScheduleApiService,
  type AvailabilityWindow,
  type OccupiedBlock,
  type ScheduledService,
  type ScheduleAvailability,
} from './schedule-api.service';

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
  private availabilitySequence = 0;

  readonly services = signal<ScheduledService[]>([]);
  readonly selectedId = signal('');
  readonly selected = computed(
    () => this.services().find((service) => service.id === this.selectedId()) ?? null,
  );
  readonly start = signal('');
  readonly end = signal('');
  readonly date = signal('');
  readonly availability = signal<ScheduleAvailability | null>(null);
  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly selectedRange = computed(() => {
    const start = this.start();
    const end = this.end();
    if (!start || !end) return null;
    const startsAt = new Date(start);
    const endsAt = new Date(end);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return null;
    if (endsAt <= startsAt) return null;
    return { startsAt, endsAt };
  });

  readonly conflict = computed<OccupiedBlock | null>(() => {
    const range = this.selectedRange();
    const data = this.availability();
    if (!range || !data) return null;
    const start = range.startsAt.getTime();
    const end = range.endsAt.getTime();
    return data.occupied.find((block) => {
      const blockStart = Date.parse(block.startsAt);
      const blockEnd = Date.parse(block.endsAt);
      return start < blockEnd && end > blockStart;
    }) ?? null;
  });

  readonly outsideAvailability = computed(() => {
    const range = this.selectedRange();
    const data = this.availability();
    if (!range || !data) return false;
    const start = range.startsAt.getTime();
    const end = range.endsAt.getTime();
    return !data.available.some((slot) => (
      start >= Date.parse(slot.startsAt) && end <= Date.parse(slot.endsAt)
    ));
  });

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
        this.loadAvailability();
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
    this.loadAvailability();
  }

  changeDate(value: string): void {
    this.date.set(value);
    this.error.set('');
    this.success.set('');
    this.loadAvailability();
  }

  onStartChange(value: string): void {
    this.start.set(value);
    const date = value.slice(0, 10);
    if (date && date !== this.date()) {
      this.date.set(date);
      this.loadAvailability();
    }
  }

  onEndChange(value: string): void {
    this.end.set(value);
  }

  useSlot(slot: AvailabilityWindow): void {
    const startsAt = Date.parse(slot.startsAt);
    const endsAt = Date.parse(slot.endsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return;
    const suggestedEnd = Math.min(startsAt + 60 * 60 * 1000, endsAt);
    this.start.set(toLocalInput(new Date(startsAt).toISOString()));
    this.end.set(toLocalInput(new Date(suggestedEnd).toISOString()));
    this.error.set('');
    this.success.set('');
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
    if (this.availabilityLoading()) {
      this.error.set('Espera a que termine de cargar la disponibilidad del trabajador.');
      return;
    }
    if (this.conflict()) {
      this.error.set('El horario cruza con otro servicio del trabajador. Elige una franja disponible.');
      return;
    }
    if (this.outsideAvailability()) {
      this.error.set('El horario está fuera de la disponibilidad del trabajador para esa fecha.');
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
        this.loadAvailability();
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
    const timeZone = this.availability()?.timeZone;
    return new Date(value).toLocaleString('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timeZone ? { timeZone } : {}),
    });
  }

  formatTime(value: string): string {
    const timeZone = this.availability()?.timeZone;
    return new Date(value).toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    });
  }

  statusLabel(status: OccupiedBlock['status']): string {
    return status === 'in_progress' ? 'Servicio en curso' : 'Servicio programado';
  }

  private loadAvailability(): void {
    const service = this.selected();
    const token = this.auth.getAccessToken();
    if (!service || !token || !this.date()) {
      this.availabilitySequence++;
      this.availability.set(null);
      this.availabilityLoading.set(false);
      return;
    }

    const sequence = ++this.availabilitySequence;
    this.availabilityLoading.set(true);
    this.availabilityError.set('');
    this.api.availability(service.id, this.date(), token).subscribe({
      next: (availability) => {
        if (sequence !== this.availabilitySequence) return;
        this.availability.set(availability);
        this.availabilityLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (sequence !== this.availabilitySequence) return;
        this.availability.set(null);
        this.availabilityError.set(this.errorMessage(error, 'No se pudo consultar la disponibilidad del trabajador.'));
        this.availabilityLoading.set(false);
      },
    });
  }

  private syncFields(): void {
    const service = this.selected();
    this.start.set(service?.scheduled_start ? toLocalInput(service.scheduled_start) : '');
    this.end.set(service?.scheduled_end ? toLocalInput(service.scheduled_end) : '');
    this.date.set(service?.scheduled_start
      ? toDateInput(new Date(service.scheduled_start))
      : toDateInput(new Date()));
  }

  private errorMessage(error: HttpErrorResponse, fallback?: string): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message) return message;
    if (error.status === 0) return 'No se pudo conectar con la API. Comprueba que NestJS esté ejecutándose.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    return fallback ?? `No se pudo guardar el horario (error ${error.status}).`;
  }
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function toDateInput(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}
