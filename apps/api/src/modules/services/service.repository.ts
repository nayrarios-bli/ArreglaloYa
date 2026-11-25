import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';

export interface ServiceQuote {
  id: string;
  service_id: string;
  quote_type: 'estimate' | 'transport' | 'final';
  amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  decision?: 'accepted' | 'rejected' | null;
}

@Injectable()
export class ServicesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async submitQuote(input: {
    serviceId: string;
    workerId: string;
    quoteType: 'transport' | 'final';
    amount: number;
    notes: string | null;
  }): Promise<ServiceQuote> {
    const { data, error } = await this.supabase.admin.rpc(
      'submit_service_quote',
      {
        p_service_id: input.serviceId,
        p_worker_id: input.workerId,
        p_quote_type: input.quoteType,
        p_amount: input.amount,
        p_notes: input.notes,
      },
    );

    if (error) {
      this.throwRpcError(error.message ?? '');
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      throw new InternalServerErrorException(
        'No se recibió la cotización guardada.',
      );
    }

    return result as ServiceQuote;
  }

  async decideFinalQuote(input: {
    serviceId: string;
    quoteId: string;
    clientId: string;
    decision: 'accepted' | 'rejected';
  }) {
    const { data, error } = await this.supabase.admin.rpc(
      'decide_final_service_quote',
      {
        p_service_id: input.serviceId,
        p_quote_id: input.quoteId,
        p_client_id: input.clientId,
        p_decision: input.decision,
      },
    );

    if (error) {
      this.throwRpcError(error.message ?? '');
    }

    return data;
  }

  async listQuotesForClient(
    serviceId: string,
    clientId: string,
  ): Promise<ServiceQuote[]> {
    const { data: service, error: serviceError } =
      await this.supabase.admin
        .from('services')
        .select('id')
        .eq('id', serviceId)
        .eq('client_id', clientId)
        .maybeSingle();

    if (serviceError) {
      throw new InternalServerErrorException(
        'No se pudo consultar el servicio.',
      );
    }

    if (!service) {
      throw new NotFoundException('No se encontró el servicio.');
    }

    return this.listQuotesWithDecisions(serviceId);
  }

  async listQuotesForWorker(
    serviceId: string,
    workerId: string,
  ): Promise<ServiceQuote[]> {
    const { data: service, error: serviceError } =
      await this.supabase.admin
        .from('services')
        .select('id')
        .eq('id', serviceId)
        .eq('worker_id', workerId)
        .maybeSingle();

    if (serviceError) {
      throw new InternalServerErrorException(
        'No se pudo consultar el servicio.',
      );
    }

    if (!service) {
      throw new NotFoundException('No se encontró el servicio.');
    }

    return this.listQuotesWithDecisions(serviceId);
  }

  private async listQuotesWithDecisions(
    serviceId: string,
  ): Promise<ServiceQuote[]> {
    const [quotesResult, eventsResult] = await Promise.all([
      this.supabase.admin
        .from('service_quotes')
        .select(
          'id, service_id, quote_type, amount, notes, created_by, created_at',
        )
        .eq('service_id', serviceId)
        .order('created_at', { ascending: true }),

      this.supabase.admin
        .from('service_events')
        .select('event_type, details')
        .eq('service_id', serviceId)
        .in('event_type', [
          'final_quote_accepted',
          'final_quote_rejected',
        ]),
    ]);

    if (quotesResult.error || eventsResult.error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las cotizaciones.',
      );
    }

    const decisions = new Map<string, 'accepted' | 'rejected'>();

    for (const event of eventsResult.data ?? []) {
      const details = event.details as { quoteId?: string } | null;
      if (!details?.quoteId) continue;

      decisions.set(
        details.quoteId,
        event.event_type === 'final_quote_accepted'
          ? 'accepted'
          : 'rejected',
      );
    }

    return ((quotesResult.data ?? []) as ServiceQuote[]).map((quote) => ({
      ...quote,
      decision: decisions.get(quote.id) ?? null,
    }));
  }

  private throwRpcError(message: string): never {
    if (message.includes('SERVICE_NOT_FOUND')) {
      throw new NotFoundException('No se encontró el servicio.');
    }

    if (message.includes('NOT_SERVICE_WORKER')) {
      throw new ForbiddenException(
        'Este servicio no pertenece a tu cuenta de trabajador.',
      );
    }

    if (message.includes('NOT_SERVICE_CLIENT')) {
      throw new ForbiddenException(
        'Este servicio no pertenece a tu cuenta de cliente.',
      );
    }

    if (message.includes('FINAL_QUOTE_NOT_FOUND')) {
      throw new NotFoundException(
        'No se encontró la cotización definitiva.',
      );
    }

    if (
      message.includes('QUOTE_ALREADY_EXISTS') ||
      message.includes('QUOTE_ALREADY_DECIDED') ||
      message.includes('SERVICE_NOT_ACTIVE') ||
      message.includes('SERVICE_NOT_SCHEDULED') ||
      message.includes('TRANSPORT_QUOTE_REQUIRED')
    ) {
      throw new ConflictException(
        'El servicio o la cotización ya no permite esta operación.',
      );
    }

    if (
      message.includes('SERVICE_DOES_NOT_REQUIRE_VISIT') ||
      message.includes('INVALID_AMOUNT') ||
      message.includes('INVALID_QUOTE_TYPE') ||
      message.includes('INVALID_DECISION')
    ) {
      throw new ConflictException(
        'La cotización no es válida para este servicio.',
      );
    }

    throw new InternalServerErrorException(
      'No se pudo completar la operación de la cotización.',
    );
  }
}