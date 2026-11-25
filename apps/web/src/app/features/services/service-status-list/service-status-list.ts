import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_URL } from '../../../core/api-url';
import { AuthService } from '../../../core/auth.service';
import { WhatsappLink } from '../whatsapp-link/whatsapp-link';

type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface StatusEvent {
  status: ServiceStatus;
  at: string;
}

interface ServiceItem {
  id: string;
  title: string;
  created_at: string;
  category: string;
  contact_phone: string | null;
  status: ServiceStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
  final_amount: number | string | null;
  history: StatusEvent[];
}

@Component({
  selector: 'app-service-status-list',
  standalone: true,
  imports: [RouterLink, WhatsappLink],
  templateUrl: './service-status-list.html',
  styleUrl: './service-status-list.css',
})
export class ServiceStatusList implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly isWorker = this.auth.getUser()?.role === 'worker';
  readonly labels: Record<ServiceStatus, string> = {
    scheduled: 'Programado',
    in_progress: 'En curso',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };

  services = signal<ServiceItem[]>([]);
  openId = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.auth.getAccessToken();
    if (!token) { this.loading.set(false); this.error.set('Inicia sesión para consultar tus servicios.'); return; }
    this.http.get<ServiceItem[]>(`${API_URL}/services/mine`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: (services) => { this.services.set(services); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message ?? 'No se pudo cargar el historial.'); this.loading.set(false); },
    });
  }

  toggle(id: string) {
    this.openId.update((current) => (current === id ? null : id));
  }

  lastUpdate(service: ServiceItem): string {
    return service.history[service.history.length - 1]?.at ?? service.created_at ?? '';
  }

  formatDate(value: string) {
    return new Date(value).toLocaleString('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}
