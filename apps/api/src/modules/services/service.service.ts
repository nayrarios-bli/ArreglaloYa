import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreateServiceQuoteDto } from './dto/create-service-quote.dto.js';
import { DecideFinalQuoteDto } from './dto/decide-final-quote.dto.js';
import {
  ServiceQuote,
  ServicesRepository,
} from './service.repository.js';

@Injectable()
export class ServicesService {
  constructor(private readonly repository: ServicesRepository) {}

  createTransportQuote(
    serviceId: string,
    workerId: string,
    input: CreateServiceQuoteDto,
  ): Promise<ServiceQuote> {
    this.validateAmount(input.amount);

    return this.repository.submitQuote({
      serviceId,
      workerId,
      quoteType: 'transport',
      amount: input.amount,
      notes: input.notes?.trim() || null,
    });
  }

  createFinalQuote(
    serviceId: string,
    workerId: string,
    input: CreateServiceQuoteDto,
  ): Promise<ServiceQuote> {
    this.validateAmount(input.amount);

    return this.repository.submitQuote({
      serviceId,
      workerId,
      quoteType: 'final',
      amount: input.amount,
      notes: input.notes?.trim() || null,
    });
  }

  listForWorker(
    serviceId: string,
    workerId: string,
  ): Promise<ServiceQuote[]> {
    return this.repository.listQuotesForWorker(serviceId, workerId);
  }

  listForClient(
    serviceId: string,
    clientId: string,
  ): Promise<ServiceQuote[]> {
    return this.repository.listQuotesForClient(serviceId, clientId);
  }

  decideFinalQuote(
    serviceId: string,
    quoteId: string,
    clientId: string,
    input: DecideFinalQuoteDto,
  ) {
    if (!['accepted', 'rejected'].includes(input.decision)) {
      throw new BadRequestException(
        'La decisión debe ser accepted o rejected.',
      );
    }

    return this.repository.decideFinalQuote({
      serviceId,
      quoteId,
      clientId,
      decision: input.decision,
    });
  }

  private validateAmount(amount: number): void {
    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      throw new BadRequestException(
        'El monto debe ser un número igual o mayor a cero.',
      );
    }
  }
}