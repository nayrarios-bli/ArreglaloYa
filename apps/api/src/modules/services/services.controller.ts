import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { WorkerStatusGuard } from '../auth/guards/worker-status.guard.js';
import { ServicesService } from './services.service.js';

interface AuthRequest extends Request { user: { id: string }; }

@Controller('services')
@UseGuards(SupabaseAuthGuard, RolesGuard, WorkerStatusGuard)
@Roles('worker')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get(':serviceId/status')
  getOne(@Req() req: AuthRequest, @Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.services.getWorkerService(serviceId, req.user.id);
  }

  @Patch(':serviceId/status')
  updateStatus(
    @Req() req: AuthRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() body: { status?: unknown; code?: unknown },
  ) {
    return this.services.updateStatus(serviceId, req.user.id, body?.status, body?.code);
  }
}
