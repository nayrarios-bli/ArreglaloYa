import { Component, computed, signal } from '@angular/core';

type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

@Component({
  selector: 'app-service-status-update',
  templateUrl: './service-status-update.html',
  styleUrl: './service-status-update.css',
})
export class ServiceStatusUpdate {
  readonly labels: Record<ServiceStatus, string> = {
    scheduled: 'Programado',
    in_progress: 'En curso',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };

  readonly steps: ServiceStatus[] = ['scheduled', 'in_progress', 'completed'];

  // TODO: el estado inicial vendrá de la API cuando exista la conexión.
  status = signal<ServiceStatus>('scheduled');
  finishedAt = signal<string | null>(null);
  confirmingFinish = signal(false);

    currentStep = computed(() =>
    this.status() === 'completed' ? this.steps.length : this.steps.indexOf(this.status()),
  );

  startService() {
    if (this.status() === 'scheduled') {
      this.status.set('in_progress');
    }
  }

  askFinish() {
    this.confirmingFinish.set(true);
  }

  cancelFinish() {
    this.confirmingFinish.set(false);
  }

  finishService() {
    if (this.status() === 'in_progress') {
      this.status.set('completed');
      this.finishedAt.set(new Date().toLocaleString('es-BO'));
      this.confirmingFinish.set(false);
    }
  }
}