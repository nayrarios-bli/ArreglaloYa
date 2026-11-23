
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

import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';

import { AdminService } from './admin.service.js';
import { ReviewWorkerDto } from './dto/review-worker.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  // CONSULTAR TRABAJADORES PENDIENTES
  @Get('workers/pending')
  getPendingWorkers() {
    return this.adminService.getPendingWorkers();
  }

  // APROBAR O RECHAZAR UN TRABAJADOR
  @Patch('workers/:workerId/review')
  reviewWorker(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Body() body: ReviewWorkerDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.adminService.reviewWorker(
      workerId,
      request.user.id,
      body,
    );
  }
}
