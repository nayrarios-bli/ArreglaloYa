import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateReviewDto } from './reviews.dto.js';

@Injectable()
export class ReviewsService {
  private reviews: any[] = [];

  create(createReviewDto: CreateReviewDto) {
    const existingReview = this.reviews.find(
      (r) => 
        r.serviceId === createReviewDto.serviceId && 
        r.reviewerId === createReviewDto.reviewerId
    );

    if (existingReview) {
      throw new BadRequestException('Ya has registrado una calificación para este servicio.');
    }

    const newReview = {
      id: Date.now().toString(),
      ...createReviewDto,
      createdAt: new Date(),
    };

    this.reviews.push(newReview);

    return {
      message: 'Calificación registrada con éxito (HU-09 / HU-10)',
      review: newReview,
    };
  }

  findAll() {
    return this.reviews;
  }
}