import { Component, signal } from '@angular/core';

type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

@Component({
  selector: 'app-service-status-update',
  templateUrl: './service-status-update.html',
})
export class ServiceStatusUpdate {
  readonly labels: Record<ServiceStatus, string> = {
    scheduled: 'Programado',
    in_progress: 'En curso',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };

  // TODO: el estado inicial vendrá de la API cuando exista la conexión.
  status = signal<ServiceStatus>('scheduled');
  finishedAt = signal<string | null>(null);

  startService() {
    if (this.status() === 'scheduled') {
      this.status.set('in_progress');
    }
  }

  finishService() {
    if (this.status() === 'in_progress') {
      this.status.set('completed');
      this.finishedAt.set(new Date().toLocaleString('es-BO'));
    }
  }
}