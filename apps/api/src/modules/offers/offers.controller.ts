import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { OffersService } from './offers.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('requests/:requestId/offers')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('worker')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  createOffer(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateOfferDto,
  ) {
    return this.offersService.createOffer(requestId, request.user.id, input);
  }
}
