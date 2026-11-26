import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AppRole } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
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

  @Get(':serviceId/availability')
  getAvailability(
    @Req() request: AuthenticatedRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.schedule.getAvailability(
      serviceId,
      request.user.id,
      request.userRole,
      query.date,
    );
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
