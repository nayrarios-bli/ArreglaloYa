import { Component, computed, signal } from '@angular/core';

type PaymentMethod = 'cash' | 'qr' | 'other';

@Component({
  selector: 'app-payment-confirmation',
  templateUrl: './payment-confirmation.html',
})
export class PaymentConfirmation {
  readonly methods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'qr', label: 'QR' },
    { value: 'other', label: 'Otro' },
  ];

  amount = signal<number | null>(null);
  method = signal<PaymentMethod>('cash');
  confirmed = signal(false);
  error = signal<string | null>(null);

  methodLabel = computed(
    () => this.methods.find((m) => m.value === this.method())?.label ?? '',
  );

  // TODO: enviar la confirmación a la API cuando exista la conexión.
  confirmPayment() {
    const value = this.amount();
    if (value === null || Number.isNaN(value) || value < 0) {
      this.error.set('Ingresa un monto válido (0 o más).');
      return;
    }
    this.error.set(null);
    this.confirmed.set(true);
  }
}