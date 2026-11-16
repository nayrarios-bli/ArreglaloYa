import { Component, signal } from '@angular/core';

interface Slot {
  start: string;
  end: string;
}

@Component({
  selector: 'app-schedule-agreement',
  templateUrl: './schedule-agreement.html',
})
export class ScheduleAgreement {
  // TODO: los horarios ocupados del trabajador vendrán de la API.
  busySlots: Slot[] = [{ start: '2026-11-20T09:00', end: '2026-11-20T11:00' }];

  start = signal('');
  end = signal('');
  agreed = signal<Slot | null>(null);
  error = signal<string | null>(null);

  // TODO: guardar el horario en la API (scheduled_start y scheduled_end).
  confirmSchedule() {
    const start = this.start();
    const end = this.end();

    if (!start || !end) {
      this.error.set('Elige la fecha y hora de inicio y de fin.');
      return;
    }
    if (new Date(start) < new Date()) {
      this.error.set('El horario no puede estar en el pasado.');
      return;
    }
    if (new Date(end) <= new Date(start)) {
      this.error.set('La hora de fin debe ser posterior al inicio.');
      return;
    }

    const overlaps = this.busySlots.some(
      (s) => new Date(start) < new Date(s.end) && new Date(end) > new Date(s.start),
    );
    if (overlaps) {
      this.error.set('El trabajador ya tiene un servicio en ese horario. Elige otro.');
      return;
    }

    this.error.set(null);
    this.agreed.set({ start, end });
  }

  formatSlot(value: string) {
    return new Date(value).toLocaleString('es-BO');
  }
}