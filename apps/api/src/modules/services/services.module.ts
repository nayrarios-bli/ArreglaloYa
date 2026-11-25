import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';
import { ServiceHistoryController } from './service-history.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [ServicesController, ServiceHistoryController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
