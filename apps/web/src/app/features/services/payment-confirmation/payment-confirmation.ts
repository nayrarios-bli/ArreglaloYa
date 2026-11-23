import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import {
  PaymentApiService,
  PaymentMethod,
  PaymentState,
  ServicePayment,
} from '../payment-api.service';

// Ponlo en true SOLO para ver el diseño sin datos reales.
// Déjalo en false antes de hacer commit.
const USE_DEMO_DATA = false;

const DEMO_SERVICES: ServicePayment[] = [
  {
    id: 'demo0001-aaaa',
    request_id: 'r1',
    status: 'completed',
    final_amount: 450,
    myConfirmation: null,
    otherConfirmation: null,
    paymentState: 'not_started',
  },
  {
    id: 'demo0002-bbbb',
    request_id: 'r2',
    status: 'completed',
    final_amount: 300,
    myConfirmation: null,
    otherConfirmation: {
      service_id: 'demo0002-bbbb',
      confirmed_by: 'otro',
      declared_amount: 300,
      method: 'qr',
      confirmed_at: '2026-11-23T10:00:00Z',
    },
    paymentState: 'waiting_for_me',
  },
  {
    id: 'demo0003-cccc',
    request_id: 'r3',
    status: 'completed',
    final_amount: 120,
    myConfirmation: {
      service_id: 'demo0003-cccc',
      confirmed_by: 'yo',
      declared_amount: 120,
      method: 'cash',
      confirmed_at: '2026-11-23T10:00:00Z',
    },
    otherConfirmation: {
      service_id: 'demo0003-cccc',
      confirmed_by: 'otro',
      declared_amount: 100,
      method: 'cash',
      confirmed_at: '2026-11-23T10:05:00Z',
    },
    paymentState: 'mismatch',
  },
];

type Tone = 'neutral' | 'info' | 'success' | 'warning';

@Component({
  selector: 'app-payment-confirmation',
  templateUrl: './payment-confirmation.html',
  styleUrl: './payment-confirmation.css',
})
export class PaymentConfirmation implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(PaymentApiService);

  readonly demoMode = USE_DEMO_DATA;

  readonly methods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'qr', label: 'QR' },
  ];

  readonly stateInfo: Record<PaymentState, { text: string; tone: Tone }> = {
    not_started: { text: 'Aún no hay confirmaciones.', tone: 'neutral' },
    waiting_for_other: {
      text: 'Tu declaración quedó guardada; falta la otra parte.',
      tone: 'info',
    },
    waiting_for_me: {
      text: 'La otra parte declaró el pago; falta tu confirmación.',
      tone: 'info',
    },
    matched: {
      text: 'Ambas declaraciones coinciden en monto y método.',
      tone: 'success',
    },
    mismatch: {
      text: 'Las declaraciones difieren; revisen el monto o método.',
      tone: 'warning',
    },
  };

  services = signal<ServicePayment[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  selectedId = signal<string | null>(null);
  selected = computed(
    () => this.services().find((s) => s.id === this.selectedId()) ?? null,
  );

  amountText = signal('');
  method = signal<PaymentMethod>('cash');
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  private async load() {
    if (USE_DEMO_DATA) {
      this.services.set(DEMO_SERVICES);
      this.loading.set(false);
      return;
    }

    const token = await this.auth.getAccessToken();
    if (!token) {
      this.loadError.set('Tu sesión expiró. Vuelve a iniciar sesión.');
      this.loading.set(false);
      return;
    }

    this.api.listForUser(token).subscribe({
      next: (res) => {
        this.services.set(res.services);
        this.loading.set(false);
        if (res.services.length === 1) {
          this.select(res.services[0]);
        }
      },
      error: () => {
        this.loadError.set('No se pudieron cargar tus servicios. Intenta de nuevo.');
        this.loading.set(false);
      },
    });
  }

  select(service: ServicePayment) {
    this.selectedId.set(service.id);
    this.saveError.set(null);
    this.saveSuccess.set(null);
    const mine = service.myConfirmation;
    this.amountText.set(mine ? String(Number(mine.declared_amount)) : '');
    this.method.set(mine ? mine.method : 'cash');
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    const service = this.selected();
    if (!service) return;

    this.saveError.set(null);
    this.saveSuccess.set(null);

    const value = Number(this.amountText());
    const validAmount =
      this.amountText().trim() !== '' &&
      Number.isFinite(value) &&
      value >= 0 &&
      Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;

    if (!validAmount) {
      this.saveError.set('Ingresa un monto válido (0 o más, con hasta dos decimales).');
      return;
    }

    if (USE_DEMO_DATA) {
      this.saveSuccess.set('Modo de ejemplo: no se envió nada al servidor.');
      return;
    }

    const token = await this.auth.getAccessToken();
    if (!token) {
      this.saveError.set('Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }

    this.saving.set(true);
    this.api.confirm(service.id, value, this.method(), token).subscribe({
      next: (res) => {
        this.services.update((list) =>
          list.map((s) =>
            s.id === res.serviceId
              ? {
                  ...s,
                  myConfirmation: res.myConfirmation,
                  otherConfirmation: res.otherConfirmation,
                  paymentState: res.paymentState,
                }
              : s,
          ),
        );
        this.saveSuccess.set('Tu declaración quedó guardada.');
        this.saving.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.saveError.set(
          (Array.isArray(msg) ? msg.join(' ') : msg) ??
            'No se pudo guardar la declaración. Intenta de nuevo.',
        );
        this.saving.set(false);
      },
    });
  }

  methodLabel(method: PaymentMethod) {
    return this.methods.find((m) => m.value === method)?.label ?? method;
  }

  formatAmount(value: number | string) {
    return `Bs ${Number(value).toFixed(2)}`;
  }

  shortId(id: string) {
    return id.slice(0, 8);
  }
}