import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  offer: { requires_visit: boolean } | null;
}

interface Quote {
  id: string;
  quote_type: 'estimate' | 'transport' | 'final';
  amount: number;
  notes: string | null;
  decision?: 'accepted' | 'rejected' | null;
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
  readonly quotes = signal<Quote[]>([]);
  readonly hasTransportQuote = computed(() => this.quotes().some((quote) => quote.quote_type === 'transport'));
  readonly hasFinalQuote = computed(() => this.quotes().some((quote) => quote.quote_type === 'final'));
  readonly actionError = signal('');
  readonly busy = signal(false);
  readonly code = signal<{ serviceId: string; code: string; expiresAt: string } | null>(null);

  ngOnInit(): void {
    const token = this.auth.getAccessToken();
    if (!token) { this.loading.set(false); this.error.set('Inicia sesión para consultar tus servicios.'); return; }
    this.http.get<ServiceItem[]>(`${API_URL}/services/mine`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: (services) => { this.services.set(services); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message ?? 'No se pudo cargar el historial.'); this.loading.set(false); },
    });
  }

  toggle(id: string) {
    if (this.busy()) return;
    this.openId.update((current) => (current === id ? null : id));
    this.quotes.set([]);
    this.actionError.set('');
    const service = this.services().find((item) => item.id === id);
    if (this.openId() && service?.offer?.requires_visit) this.loadQuotes(id);
  }

  private headers() {
    return { Authorization: `Bearer ${this.auth.getAccessToken() ?? ''}` };
  }

  private loadQuotes(id: string) {
    this.busy.set(true);
    const suffix = this.isWorker ? '/mine' : '';
    this.http.get<Quote[]>(`${API_URL}/services/${id}/quotes${suffix}`, { headers: this.headers() }).subscribe({
      next: (quotes) => { this.quotes.set(quotes); this.busy.set(false); },
      error: (error: HttpErrorResponse) => this.showActionError(error),
    });
  }

  submitQuote(id: string, kind: 'transport' | 'final', value: string) {
    const amount = Number(value);
    if (!value.trim() || !Number.isFinite(amount) || amount < 0) {
      this.actionError.set('Ingresa un monto válido.');
      return;
    }
    this.saveQuote(id, kind, { amount });
  }

  decideQuote(id: string, quoteId: string, decision: 'accepted' | 'rejected') {
    if (decision === 'rejected' && !window.confirm('Rechazar el precio cancelará el servicio. ¿Quieres continuar?')) return;
    this.saveQuote(id, `${quoteId}/decision`, { decision });
  }

  private saveQuote(id: string, path: string, body: object) {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.http.post(`${API_URL}/services/${id}/quotes/${path}`, body, { headers: this.headers() }).subscribe({
      next: () => { this.ngOnInit(); this.loadQuotes(id); },
      error: (error: HttpErrorResponse) => this.showActionError(error),
    });
  }

  issueCode(id: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.http.post<{ code: string; expiresAt: string }>(
      `${API_URL}/services/${id}/completion-code`, {}, { headers: this.headers() },
    ).subscribe({
      next: (result) => { this.code.set({ serviceId: id, ...result }); this.busy.set(false); },
      error: (error: HttpErrorResponse) => this.showActionError(error),
    });
  }

  private showActionError(error: HttpErrorResponse) {
    this.actionError.set(error.error?.message ?? 'No se pudo completar la operación.');
    this.busy.set(false);
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
