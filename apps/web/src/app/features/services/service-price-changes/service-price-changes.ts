import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/api-url';
import { AuthService } from '../../../core/auth.service';

interface PriceChange {
  id: string;
  reason: string;
  base_amount: number | null;
  additional_amount: number;
  status: 'pending' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-service-price-changes',
  imports: [DecimalPipe],
  templateUrl: './service-price-changes.html',
  styleUrl: './service-price-changes.css',
})
export class ServicePriceChanges implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly serviceId = input.required<string>();
  readonly isWorker = input.required<boolean>();
  readonly active = input.required<boolean>();
  readonly finalAmount = signal<number | null>(null);
  readonly priceApproved = output<void>();

  readonly changes = signal<PriceChange[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly notice = signal('');
  readonly pending = computed(() => this.changes().some((change) => change.status === 'pending'));
  readonly labels = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.http.get<{ changes: PriceChange[]; finalAmount: number | null }>(this.url(), this.options()).subscribe({
      next: ({ changes, finalAmount }) => {
        this.changes.set(changes);
        this.finalAmount.set(finalAmount);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loadError.set(this.message(error));
        this.loading.set(false);
      },
    });
  }

  request(event: Event, rawAmount: string, rawReason: string): void {
    event.preventDefault();
    if (this.saving() || this.pending() || !this.active() || this.finalAmount() === null) return;

    const amount = Number(rawAmount);
    const reason = rawReason.trim();
    if (!Number.isFinite(amount) || amount <= 0 || reason.length < 10 || reason.length > 500) {
      this.actionError.set('Ingresa un aumento mayor a cero y una justificación de 10 a 500 caracteres.');
      return;
    }

    this.save(this.http.post<{ message: string }>(this.url(), { amount, reason }, this.options()));
  }

  decide(change: PriceChange, approve: boolean): void {
    if (this.saving() || !this.active() || change.status !== 'pending') return;
    this.save(this.http.patch<{ message: string }>(
      this.url() + '/' + change.id, { approve }, this.options(),
    ), approve);
  }

  private save(response: Observable<{ message: string }>, approved = false): void {
    this.saving.set(true);
    this.actionError.set('');
    this.notice.set('');
    response.subscribe({
      next: ({ message }) => {
        this.saving.set(false);
        this.notice.set(message);
        if (approved) this.priceApproved.emit();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.actionError.set(this.message(error));
      },
    });
  }

  private url(): string {
    return API_URL + '/services/' + this.serviceId() + '/price-changes';
  }

  private options() {
    return { headers: { Authorization: 'Bearer ' + (this.auth.getAccessToken() ?? '') } };
  }

  private message(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    return typeof message === 'string' ? message : 'No se pudo procesar la solicitud. Intenta de nuevo.';
  }
}
