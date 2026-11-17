import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  private reviews = []; // Simulación en memoria conectada al flujo del MVP

  create(createReviewDto: CreateReviewDto) {
    // Validar que no se repita la calificación para el mismo servicio (según CU-10)
    const existingReview = this.reviews.find(
      (r) => r.serviceId === createReviewDto.serviceId && r.clientId === createReviewDto.clientId
    );

    if (existingReview) {
      throw new BadRequestException('El usuario ya calificó este servicio.');
    }

    const newReview = {
      id: Date.now().toString(),
      ...createReviewDto,
      createdAt: new Date(),
    };

    this.reviews.push(newReview);

    return {
      message: 'Calificación registrada con éxito para la HU-09 / CU-10',
      review: newReview,
    };
  }

  findAll() {
    return this.reviews;
  }
}