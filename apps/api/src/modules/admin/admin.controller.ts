import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { FilterReportDto } from './admin-report.dto.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reports')
  getReports(@Query() filters: FilterReportDto) {
    return this.adminService.getSystemActivityReport(filters);
  }
}