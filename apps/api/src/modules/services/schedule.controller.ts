import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AppRole } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { ScheduleService } from './schedule.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
  userRole: AppRole;
}

@Controller('services')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('client', 'worker')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('scheduling')
  listForScheduling(@Req() request: AuthenticatedRequest) {
    return this.schedule.listForScheduling(request.user.id, request.userRole);
  }

  @Patch(':serviceId/schedule')
  updateSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() body: unknown,
  ) {
    return this.schedule.updateSchedule(
      serviceId,
      request.user.id,
      request.userRole,
      body,
    );
  }
}
