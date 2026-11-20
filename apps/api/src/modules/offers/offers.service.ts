import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import {
  CreatedOffer,
  OffersRepository,
} from './offers.repository.js';

@Injectable()
export class OffersService {
  constructor(
    private readonly offersRepository: OffersRepository,
  ) {}

  async createOffer(
    requestId: string,
    workerId: string,
    input: CreateOfferDto,
  ): Promise<CreatedOffer> {
    this.validateOfferData(input);

    const reviewStatus =
      await this.offersRepository.getWorkerReviewStatus(workerId);

    if (reviewStatus !== 'approved') {
      throw new ForbiddenException(
        'El perfil del trabajador debe estar aprobado.',
      );
    }

    const request = await this.offersRepository.getRequest(requestId);

    if (!request) {
      throw new NotFoundException('La solicitud no existe.');
    }

    if (
      request.status !== 'open' ||
      new Date(request.expires_at).getTime() <= Date.now()
    ) {
      throw new ConflictException(
        'La solicitud ya no está vigente para recibir ofertas.',
      );
    }

    if (await this.offersRepository.hasSelectedOffer(requestId)) {
      throw new ConflictException(
        'La solicitud ya tiene una oferta seleccionada.',
      );
    }

    const categoryMatches =
      await this.offersRepository.workerHasCategory(
        workerId,
        request.category_id,
      );

    const zoneMatches = await this.offersRepository.workerHasZone(
      workerId,
      request.zone_id,
    );

    if (!categoryMatches || !zoneMatches) {
      throw new ForbiddenException(
        'La solicitud no es compatible con tu perfil.',
      );
    }

    return this.offersRepository.createOffer({
      requestId,
      workerId,
      estimatedAmount: input.estimatedAmount,
      requiresVisit: input.requiresVisit,
      message: input.message?.trim() || null,
    });
  }

  private validateOfferData(input: CreateOfferDto): void {
    if (
      typeof input.estimatedAmount !== 'number' ||
      !Number.isFinite(input.estimatedAmount) ||
      input.estimatedAmount < 0
    ) {
      throw new BadRequestException(
        'El monto estimado debe ser un número igual o mayor a cero.',
      );
    }

    if (typeof input.requiresVisit !== 'boolean') {
      throw new BadRequestException(
        'Indica si la oferta requiere una visita previa.',
      );
    }

    if (
      input.message !== undefined &&
      typeof input.message !== 'string'
    ) {
      throw new BadRequestException('El mensaje debe ser texto.');
    }
  }
}
