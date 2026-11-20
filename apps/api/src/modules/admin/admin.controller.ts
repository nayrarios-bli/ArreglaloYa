import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { AdminService } from './admin.service.js';
import { FilterAdminReportDto } from './admin.dto.js';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reports')
  getReports(@Query() filters: FilterAdminReportDto) {
    return this.adminService.getSystemActivityReport(filters);
  }
}
