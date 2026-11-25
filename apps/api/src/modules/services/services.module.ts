import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';
import { ServiceHistoryController } from './service-history.controller.js';
import { ScheduleController } from './schedule.controller.js';
import { ScheduleService } from './schedule.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ServicesController, ServiceHistoryController, ScheduleController],
  providers: [ServicesService, ScheduleService],
  exports: [ServicesService],
})
export class ServicesModule {}
