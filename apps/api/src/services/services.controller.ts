import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../modules/auth/decorators/roles.decorator.js';
import type { AppRole } from '../modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '../modules/auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../modules/auth/guards/supabase-auth.guard.js';
import { ServicesService } from './services.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
  userRole: AppRole;
}

@Controller('services')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get('scheduling')
  @Roles('client', 'worker')
  listForScheduling(@Req() request: AuthenticatedRequest) {
    return this.services.listForScheduling(request.user.id, request.userRole);
  }

  @Patch(':serviceId/schedule')
  @Roles('client', 'worker')
  updateSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() body: unknown,
  ) {
    return this.services.updateSchedule(
      serviceId,
      request.user.id,
      request.userRole,
      body,
    );
  }
}
