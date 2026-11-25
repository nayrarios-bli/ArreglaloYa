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
import { Roles } from '../modules/auth/decorators/roles.decorator.js';
import type { AppRole } from '../modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '../modules/auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../modules/auth/guards/supabase-auth.guard.js';
import { PaymentsService } from './payments.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
  userRole: AppRole;
}

@Controller('services')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payment-confirmations')
  @Roles('client', 'worker')
  listForUser(@Req() request: AuthenticatedRequest) {
    return this.payments.listForUser(request.user.id, request.userRole);
  }

  @Post(':serviceId/payment-confirmations')
  @Roles('client', 'worker')
  confirm(
    @Req() request: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() body: unknown,
  ) {
    return this.payments.confirm(
      serviceId,
      request.user.id,
      request.userRole,
      body,
    );
  }
}
