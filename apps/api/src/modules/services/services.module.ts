import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';
import { ServiceHistoryController } from './service-history.controller.js';
import { ScheduleController } from './schedule.controller.js';
import { ScheduleService } from './schedule.service.js';
import { ClientServiceQuotesController } from './client-service-quotes.controller.js';
import { WorkerServiceQuotesController } from './worker-service-quotes.controller.js';
import { ServiceQuotesService } from './service-quotes.service.js';
import { ServicesRepository } from './service.repository.js';
import { ServicePriceChangesController } from './service-price-changes.controller.js';
import { ServicePriceChangesService } from './service-price-changes.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ServicesController, ServiceHistoryController, ScheduleController, ClientServiceQuotesController, WorkerServiceQuotesController, ServicePriceChangesController],
  providers: [ServicesService, ScheduleService, ServiceQuotesService, ServicesRepository, ServicePriceChangesService],
  exports: [ServicesService],
})
export class ServicesModule {}
