import { Controller, Get, Post, Body } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { CreateAdminReportDto } from './admin.dto.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('reports')
  generateReport(@Body() dto: CreateAdminReportDto) {
    return this.adminService.generateReport(dto);
  }

  @Get('reports')
  findAllReports() {
    return this.adminService.findAllReports();
  }
}   