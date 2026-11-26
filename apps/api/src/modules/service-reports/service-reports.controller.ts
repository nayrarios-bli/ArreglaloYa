import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { ServiceReportQueryDto } from './dto/service-report-query.dto.js';
import { ServiceReportsService } from './service-reports.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

// Solo administradores y superadministradores pueden usar estos endpoints.
@Controller('admin/service-reports')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class ServiceReportsController {
  constructor(private readonly reports: ServiceReportsService) {}

  // POST porque genera el reporte y lo guarda en la base de datos.
  @Post()
  generate(
    @Req() request: AuthenticatedRequest,
    @Body() query: ServiceReportQueryDto,
  ) {
    return this.reports.generate(request.user.id, query);
  }

  @Get('history')
  history(@Req() request: AuthenticatedRequest) {
    return this.reports.history(request.user.id);
  }
}
