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
import { CreateServiceQuoteDto } from './dto/create-service-quote.dto.js';
import { ServicesService } from './service.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('services/:serviceId/quotes')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('worker')
export class WorkerServiceQuotesController {
  constructor(private readonly services: ServicesService) {}

  @Get('mine')
  listMine(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.services.listForWorker(serviceId, request.user.id);
  }

  @Post('transport')
  createTransport(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateServiceQuoteDto,
  ) {
    return this.services.createTransportQuote(
      serviceId,
      request.user.id,
      input,
    );
  }

  @Post('final')
  createFinal(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateServiceQuoteDto,
  ) {
    return this.services.createFinalQuote(
      serviceId,
      request.user.id,
      input,
    );
  }
}