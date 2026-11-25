import {
  Body,
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
import { DecideFinalQuoteDto } from './dto/decide-final-quote.dto.js';
import { ServicesService } from './service.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('services/:serviceId/quotes')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('client')
export class ClientServiceQuotesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  listQuotes(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.services.listForClient(serviceId, request.user.id);
  }

  @Post(':quoteId/decision')
  decide(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: DecideFinalQuoteDto,
  ) {
    return this.services.decideFinalQuote(
      serviceId,
      quoteId,
      request.user.id,
      input,
    );
  }
}