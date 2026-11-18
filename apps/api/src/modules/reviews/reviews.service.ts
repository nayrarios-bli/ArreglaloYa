import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateReviewDto } from './reviews.dto.js';
import { Review } from './reviews.entity.js';

@Injectable()
export class ReviewsService {
  private reviews: Review[] = [];

  create(dto: CreateReviewDto): Review {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('La calificación debe estar entre 1 y 5 estrellas (HU-09).');
    }

    const newReview: Review = {
      id: Date.now().toString(),
      ...dto,
      createdAt: new Date(),
    };

    this.reviews.push(newReview);
    return newReview;
  }

  findAll(): Review[] {
    return this.reviews;
  }

  findByWorker(workerId: string): Review[] {
    return this.reviews.filter((r) => r.workerId === workerId);
  }
}