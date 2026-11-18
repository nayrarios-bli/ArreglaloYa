import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './reviews.dto.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  @Get('worker/:workerId')
  findByWorker(@Param('workerId') workerId: string) {
    return this.reviewsService.findByWorker(workerId);
  }
}