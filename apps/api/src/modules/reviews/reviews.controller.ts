import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { CreateReviewDto } from './reviews.dto.js';
import { ReviewsService } from './reviews.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
  userRole: 'client' | 'worker';
}

@Controller('reviews')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('client', 'worker')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(request.user.id, request.userRole, dto);
  }

  @Get('service/:serviceId')
  findByService(@Req() request: AuthenticatedRequest, @Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.reviewsService.findByService(request.user.id, serviceId);
  }
}
