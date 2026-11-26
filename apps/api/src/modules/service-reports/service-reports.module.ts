import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ServiceReportsController } from './service-reports.controller.js';
import { ServiceReportsService } from './service-reports.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ServiceReportsController],
  providers: [ServiceReportsService],
})
export class ServiceReportsModule {}
