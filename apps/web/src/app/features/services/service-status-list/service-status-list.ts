import { Component } from '@angular/core';

type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface ServiceItem {
  id: string;
  title: string;
  status: ServiceStatus;
}

@Component({
  selector: 'app-service-status-list',
  templateUrl: './service-status-list.html',
})
export class ServiceStatusList {
  readonly labels: Record<ServiceStatus, string> = {
    scheduled: 'Programado',
    in_progress: 'En curso',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };

  // TODO: reemplazar por datos reales de la API cuando exista la conexión.
  services: ServiceItem[] = [
    { id: '1', title: 'Reparar fuga en el baño', status: 'scheduled' },
    { id: '2', title: 'Cambiar tomacorrientes', status: 'in_progress' },
    { id: '3', title: 'Arreglar lavadora', status: 'completed' },
  ];
}
