import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import {
  PaymentApiService,
  type PaymentMethod,
  type PaymentState,
  type ServicePayment,
} from '../payment-api.service';

@Component({
  selector: 'app-payment-test',
  imports: [FormsModule],
  templateUrl: './payment-test.html',
  styleUrl: './payment-test.css',
})
export class PaymentTest implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly paymentApi = inject(PaymentApiService);

  readonly services = signal<ServicePayment[]>([]);
  readonly selectedServiceId = signal('');
  readonly selectedService = computed(
    () => this.services().find((service) => service.id === this.selectedServiceId()) ?? null,
  );
  readonly declaredAmount = signal<number | null>(null);
  readonly method = signal<PaymentMethod>('cash');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');

  readonly methods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'qr', label: 'QR' },
  ];

  ngOnInit(): void {
    const token = this.auth.getAccessToken();
    if (!token) {
      this.loading.set(false);
      this.error.set('Inicia sesión para probar la conexión con la API.');
      return;
    }

    this.paymentApi.listForUser(token).subscribe({
      next: ({ services }) => {
        this.services.set(services);
        this.selectedServiceId.set(services[0]?.id ?? '');
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  confirmPayment(): void {
    const token = this.auth.getAccessToken();
    const serviceId = this.selectedServiceId();
    const amount = this.declaredAmount();

    if (!serviceId || amount === null || !Number.isFinite(amount)) {
      this.error.set('Selecciona un servicio e indica el monto que declaras.');
      return;
    }
    if (!token) {
      this.error.set('Tu sesión expiró. Inicia sesión nuevamente.');
      return;
    }

    this.error.set('');
    this.feedback.set('');
    this.saving.set(true);
    this.paymentApi.confirm(serviceId, amount, this.method(), token).subscribe({
      next: (result) => {
        this.services.update((services) => services.map((service) =>
          service.id === result.serviceId
            ? {
                ...service,
                myConfirmation: result.myConfirmation,
                otherConfirmation: result.otherConfirmation,
                paymentState: result.paymentState,
              }
            : service,
        ));
        this.saving.set(false);
        this.feedback.set(`${this.stateLabel(result.paymentState)} ${result.message}`);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.errorMessage(error));
      },
    });
  }

  stateLabel(state: PaymentState): string {
    switch (state) {
      case 'not_started': return 'Aún no hay confirmaciones.';
      case 'waiting_for_other': return 'Tu confirmación quedó guardada; falta la otra parte.';
      case 'waiting_for_me': return 'La otra parte confirmó; falta tu declaración.';
      case 'matched': return 'Ambas declaraciones coinciden.';
      case 'mismatch': return 'Las declaraciones difieren; revisen el monto y el método.';
    }
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
