import { Component, signal } from '@angular/core';

type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface StatusEvent {
  status: ServiceStatus;
  at: string;
}

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  status: ServiceStatus;
  history: StatusEvent[];
}

// TODO: reemplazar por datos reales de la API cuando exista la conexión.
const DEMO_SERVICES: ServiceItem[] = [
  {
    id: '1',
    title: 'Reparar fuga en el baño',
    category: 'Plomería',
    status: 'scheduled',
    history: [{ status: 'scheduled', at: '2026-11-22T09:00:00' }],
  },
  {
    id: '2',
    title: 'Cambiar tomacorrientes',
    category: 'Electricidad',
    status: 'in_progress',
    history: [
      { status: 'scheduled', at: '2026-11-20T15:30:00' },
      { status: 'in_progress', at: '2026-11-23T10:15:00' },
    ],
  },
  {
    id: '3',
    title: 'Arreglar lavadora',
    category: 'Electrodomésticos',
    status: 'completed',
    history: [
      { status: 'scheduled', at: '2026-11-15T11:00:00' },
      { status: 'in_progress', at: '2026-11-16T09:00:00' },
      { status: 'completed', at: '2026-11-16T12:40:00' },
    ],
  },
  {
    id: '4',
    title: 'Revocar pared del patio',
    category: 'Albañilería',
    status: 'cancelled',
    history: [
      { status: 'scheduled', at: '2026-11-10T08:00:00' },
      { status: 'cancelled', at: '2026-11-11T17:20:00' },
    ],
  },
];

@Component({
  selector: 'app-service-status-list',
  templateUrl: './service-status-list.html',
  styleUrl: './service-status-list.css',
})
export class ServiceStatusList {
  readonly labels: Record<ServiceStatus, string> = {
    scheduled: 'Programado',
    in_progress: 'En curso',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };

  services = signal<ServiceItem[]>(DEMO_SERVICES);
  openId = signal<string | null>(null);

  toggle(id: string) {
    this.openId.update((current) => (current === id ? null : id));
  }

  lastUpdate(service: ServiceItem): string {
    return service.history[service.history.length - 1]?.at ?? '';
  }

  formatDate(value: string) {
    return new Date(value).toLocaleString('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}