import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { ScheduleApiService, type ScheduledService } from '../schedule-api.service';

@Component({
  selector: 'app-schedule-test',
  imports: [FormsModule],
  templateUrl: './schedule-test.html',
  styleUrl: './schedule-test.css',
})
export class ScheduleTest implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly scheduleApi = inject(ScheduleApiService);

  readonly services = signal<ScheduledService[]>([]);
  readonly selectedServiceId = signal('');
  readonly startsAt = signal('');
  readonly endsAt = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');

  ngOnInit(): void {
    const token = this.auth.getAccessToken();
    if (!token) {
      this.loading.set(false);
      this.error.set('Inicia sesión para probar la conexión con la API.');
      return;
    }

    this.scheduleApi.listForScheduling(token).subscribe({
      next: ({ services }) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  saveSchedule(): void {
    const token = this.auth.getAccessToken();
    const serviceId = this.selectedServiceId();
    const start = this.startsAt();
    const end = this.endsAt();

    if (!serviceId || !start || !end) {
      this.error.set('Selecciona un servicio e indica el inicio y el fin.');
      return;
    }
    if (Date.parse(end) <= Date.parse(start)) {
      this.error.set('La hora de fin debe ser posterior al inicio.');
      return;
    }
    if (Date.parse(start) <= Date.now()) {
      this.error.set('El horario no puede estar en el pasado.');
      return;
    }
    if (!token) {
      this.error.set('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    this.error.set('');
    this.feedback.set('');
    this.saving.set(true);
    this.scheduleApi.updateSchedule(
      serviceId,
      new Date(start).toISOString(),
      new Date(end).toISOString(),
      token,
    ).subscribe({
      next: (updated) => {
        this.services.update((services) =>
          services.map((service) => service.id === updated.id ? updated : service),
        );
        this.saving.set(false);
        this.feedback.set('Horario acordado guardado en Supabase.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message) return message;
    if (error.status === 0) return 'No se pudo conectar con la API. Comprueba que NestJS esté ejecutándose.';
    if (error.status === 401) return 'La sesión no es válida. Inicia sesión nuevamente.';
    return `La API respondió con el error ${error.status}.`;
  }
}
