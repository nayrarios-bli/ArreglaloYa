import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { OffersService } from './offers.service.js';

@Controller('requests/:requestId/offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  createOffer(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() input: CreateOfferDto,
  ) {
    return this.offersService.createOffer(
      requestId,
      authorization,
      input,
    );
  }
}