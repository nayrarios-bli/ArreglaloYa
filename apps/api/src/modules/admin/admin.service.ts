import { Injectable } from '@nestjs/common';
import { CreateAdminReportDto } from './admin.dto.js';
import { AdminReport } from './admin.entity.js';

@Injectable()
export class AdminService {
  private reports: AdminReport[] = [];

  generateReport(dto: CreateAdminReportDto): AdminReport {
    const newReport: AdminReport = {
      id: Date.now().toString(),
      ...dto,
      createdAt: new Date(),
    };
    this.reports.push(newReport);
    return newReport;
  }

  findAllReports(): AdminReport[] {
    return this.reports;
  }
}   