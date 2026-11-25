
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
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';

import { AdminService } from './admin.service.js';
import { ReviewWorkerDto } from './dto/review-worker.dto.js';
import { FilterAdminReportDto } from './admin.dto.js';
import { AdminReportsService } from './admin-reports.service.js';

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
    private readonly reportsService: AdminReportsService,
  ) {}

  // CONSULTAR TRABAJADORES PENDIENTES
  @Get('workers/pending')
  getPendingWorkers() {
    return this.adminService.getPendingWorkers();
  }

  @Get('workers/pending/count')
  getPendingWorkerCount() {
    return this.adminService.getPendingWorkerCount();
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

  @Get('reports')
  getReports(@Query() filters: FilterAdminReportDto) {
    return this.reportsService.getSystemActivityReport(filters);
  }
}
