import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service.js';
import type { AppRole } from '../modules/auth/decorators/roles.decorator.js';

type ParticipantRole = Extract<AppRole, 'client' | 'worker'>;
type PaymentMethod = 'cash' | 'qr';
type PaymentState = 'not_started' | 'waiting_for_other' | 'waiting_for_me' | 'matched' | 'mismatch';

export interface PaymentConfirmation {
  service_id: string;
  confirmed_by: string;
  declared_amount: number | string;
  method: PaymentMethod;
  confirmed_at: string;
}

interface PaymentInput {
  declaredAmount: number;
  method: PaymentMethod;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listForUser(userId: string, role: AppRole) {
    const participantRole = this.getParticipantRole(role);
    await this.ensureWorkerApproved(userId, participantRole);
    const participantColumn = participantRole === 'client' ? 'client_id' : 'worker_id';

    const { data: services, error: servicesError } = await this.supabase.admin
      .from('services')
      .select('id, request_id, status, final_amount')
      .eq(participantColumn, userId)
      .not('final_amount', 'is', null)
      .order('created_at', { ascending: false });

    if (servicesError) this.fail('No se pudieron consultar los servicios para confirmar pagos.');
    if (!services?.length) return { services: [] };

    const serviceIds = services.map((service) => service.id);
    const { data: confirmations, error: confirmationsError } = await this.supabase.admin
      .from('payment_confirmations')
      .select('service_id, confirmed_by, declared_amount, method, confirmed_at')
      .in('service_id', serviceIds);

    if (confirmationsError) this.fail('No se pudieron consultar las confirmaciones de pago.');

    return {
      services: services.map((service) => {
        const serviceConfirmations = (confirmations ?? []) as PaymentConfirmation[];
        const entries = serviceConfirmations.filter((entry) => entry.service_id === service.id);
        return {
          ...service,
          myConfirmation: entries.find((entry) => entry.confirmed_by === userId) ?? null,
          otherConfirmation: entries.find((entry) => entry.confirmed_by !== userId) ?? null,
          paymentState: getPaymentState(entries, userId),
        };
      }),
    };
  }

  async confirm(serviceId: string, userId: string, role: AppRole, value: unknown) {
    const participantRole = this.getParticipantRole(role);
    await this.ensureWorkerApproved(userId, participantRole);
    const input = parsePayment(value);

    const { data: service, error: serviceError } = await this.supabase.admin
      .from('services')
      .select('id, client_id, worker_id, status, final_amount')
      .eq('id', serviceId)
      .maybeSingle();

    if (serviceError) this.fail('No se pudo consultar el servicio.');
    if (!service) throw new NotFoundException('No se encontró el servicio.');

    const isParticipant = participantRole === 'client'
      ? service.client_id === userId
      : service.worker_id === userId;
    if (!isParticipant) throw new NotFoundException('No se encontró el servicio.');
    if (service.final_amount === null) {
      throw new BadRequestException('El servicio debe tener un precio acordado antes de confirmar el pago.');
    }

    const { error: upsertError } = await this.supabase.admin
      .from('payment_confirmations')
      .upsert(
        {
          service_id: serviceId,
          confirmed_by: userId,
          declared_amount: input.declaredAmount,
          method: input.method,
        },
        { onConflict: 'service_id,confirmed_by' },
      );

    if (upsertError) this.fail('No se pudo guardar tu confirmación de pago.');

    const { data: confirmations, error: confirmationsError } = await this.supabase.admin
      .from('payment_confirmations')
      .select('service_id, confirmed_by, declared_amount, method, confirmed_at')
      .eq('service_id', serviceId);

    if (confirmationsError) this.fail('Se guardó tu confirmación, pero no se pudo consultar la de la otra parte.');

    const entries = (confirmations ?? []) as PaymentConfirmation[];
    return {
      serviceId,
      myConfirmation: entries.find((entry) => entry.confirmed_by === userId) ?? null,
      otherConfirmation: entries.find((entry) => entry.confirmed_by !== userId) ?? null,
      paymentState: getPaymentState(entries, userId),
      message: 'La plataforma registra las declaraciones de ambas partes; no verifica automáticamente la recepción del dinero.',
    };
  }

  private getParticipantRole(role: AppRole): ParticipantRole {
    if (role !== 'client' && role !== 'worker') {
      throw new ForbiddenException('Esta operación está disponible para clientes y trabajadores.');
    }
    return role;
  }

  private async ensureWorkerApproved(userId: string, role: ParticipantRole) {
    if (role !== 'worker') return;

    const { data, error } = await this.supabase.admin
      .from('worker_profiles')
      .select('review_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) this.fail('No se pudo verificar el perfil del trabajador.');
    if (data?.review_status !== 'approved') {
      throw new ForbiddenException('El perfil del trabajador debe estar aprobado para confirmar pagos.');
    }
  }

  private fail(message: string): never {
    throw new InternalServerErrorException(message);
  }
}

function parsePayment(value: unknown): PaymentInput {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('Indica el monto y el método de pago.');
  }

  const input = value as Record<string, unknown>;
  const amount = input['declaredAmount'];
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 9_999_999_999.99 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7
  ) {
    throw new BadRequestException('El monto debe ser válido, no negativo y tener como máximo dos decimales.');
  }

  const method = input['method'];
  if (method !== 'cash' && method !== 'qr') {
    throw new BadRequestException('El método de pago debe ser efectivo o QR.');
  }

  return { declaredAmount: amount, method };
}

function getPaymentState(
  confirmations: PaymentConfirmation[],
  userId: string,
): PaymentState {
  const mine = confirmations.find((entry) => entry.confirmed_by === userId);
  const other = confirmations.find((entry) => entry.confirmed_by !== userId);

  if (!mine && !other) return 'not_started';
  if (mine && !other) return 'waiting_for_other';
  if (!mine && other) return 'waiting_for_me';
  if (
    Number(mine!.declared_amount).toFixed(2) === Number(other!.declared_amount).toFixed(2) &&
    mine!.method === other!.method
  ) {
    return 'matched';
  }
  return 'mismatch';
}
