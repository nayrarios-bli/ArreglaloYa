import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { ServicesService } from './services.service.js';

interface AuthRequest extends Request { user: { id: string }; }

@Controller('services')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ServiceHistoryController {
  constructor(private readonly services: ServicesService) {}

  @Get('mine')
  @Roles('client', 'worker')
  listMine(@Req() req: AuthRequest) { return this.services.listMine(req.user.id); }

  @Post(':serviceId/completion-code')
  @Roles('client')
  issueCode(@Req() req: AuthRequest, @Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.services.issueCompletionCode(serviceId, req.user.id);
  }
}
