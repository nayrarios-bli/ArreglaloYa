import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_URL } from '../../../core/api-url';
import { AuthService } from '../../../core/auth.service';

type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
interface ServiceState { id: string; status: ServiceStatus; completed_at: string | null; }

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-service-status-update',
  templateUrl: './service-status-update.html',
  styleUrl: './service-status-update.css',
})
export class ServiceStatusUpdate implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private serviceId = '';
  readonly labels: Record<ServiceStatus, string> = { scheduled: 'Programado', in_progress: 'En curso', completed: 'Finalizado', cancelled: 'Cancelado' };
  readonly steps: ServiceStatus[] = ['scheduled', 'in_progress', 'completed'];
  readonly status = signal<ServiceStatus>('scheduled');
  readonly finishedAt = signal<string | null>(null);
  readonly confirmingFinish = signal(false);
  readonly completionCode = signal('');
  readonly loading = signal(true);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly currentStep = computed(() => this.status() === 'completed' ? this.steps.length : this.steps.indexOf(this.status()));

  ngOnInit(): void {
    this.serviceId = this.route.snapshot.paramMap.get('serviceId') ?? '';
    this.load();
  }

  load(): void {
    const headers = this.headers();
    if (!headers) return;
    this.loading.set(true);
    this.http.get<ServiceState>(`${API_URL}/services/${this.serviceId}/status`, { headers }).subscribe({
      next: (service) => { this.status.set(service.status); this.finishedAt.set(service.completed_at); this.loaded.set(true); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message ?? 'No se pudo cargar el servicio.'); this.loading.set(false); },
    });
  }

  startService(): void { this.saveStatus('in_progress'); }
  askFinish(): void { this.confirmingFinish.set(true); }
  cancelFinish(): void {
    this.confirmingFinish.set(false);
    this.completionCode.set('');
  }

  finishService(): void {
    if (!/^\d{6}$/.test(this.completionCode().trim())) {
      this.error.set('Ingresa el código de 6 dígitos que te dio el cliente.');
      return;
    }
    this.saveStatus('completed');
  }

  private saveStatus(status: 'in_progress' | 'completed'): void {
    const headers = this.headers();
    if (!headers || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const body = status === 'completed'
      ? { status, code: this.completionCode().trim() }
      : { status };
    this.http.patch<ServiceState>(`${API_URL}/services/${this.serviceId}/status`, body, { headers }).subscribe({
      next: (service) => { this.status.set(service.status); this.finishedAt.set(service.completed_at); this.confirmingFinish.set(false); this.saving.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message ?? 'No se pudo guardar el nuevo estado.'); this.saving.set(false); },
    });
  }

  private headers() {
    const token = this.auth.getAccessToken();
    if (!token) { this.error.set('Tu sesión expiró. Inicia sesión nuevamente.'); this.loading.set(false); return null; }
    return { Authorization: `Bearer ${token}` };
  }
}
