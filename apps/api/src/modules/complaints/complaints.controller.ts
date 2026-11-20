import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { CreateComplaintDto } from './complaints.dto.js';
import { ComplaintsService } from './complaints.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('complaints')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @Roles('client', 'worker')
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateComplaintDto) {
    return this.complaintsService.create(request.user.id, dto);
  }

  @Get('mine')
  @Roles('client', 'worker')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.complaintsService.findMine(request.user.id);
  }

  @Get()
  @Roles('admin', 'superadmin')
  findAllForAdmin() {
    return this.complaintsService.findAllForAdmin();
  }
}
