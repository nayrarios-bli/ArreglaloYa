import {
  Controller,
  Get,
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
import { OffersService } from './offers.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('requests/:requestId/offers')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('client')
export class ClientOffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  listOffers(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.offersService.listOffersForClient(
      requestId,
      request.user.id,
    );
  }

  @Post(':offerId/select')
  selectOffer(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.offersService.selectOfferForClient(
      requestId,
      offerId,
      request.user.id,
    );
  }
  @Get(':offerId/worker-profile')
getWorkerProfile(
  @Param('requestId', ParseUUIDPipe) requestId: string,
  @Param('offerId', ParseUUIDPipe) offerId: string,
  @Req() request: AuthenticatedRequest,
) {
  return this.offersService.getPublicWorkerProfileForOffer(
    requestId,
    offerId,
    request.user.id,
  );
}
}