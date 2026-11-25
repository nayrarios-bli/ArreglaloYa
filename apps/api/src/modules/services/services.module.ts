import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClientServiceQuotesController } from './client-service-quotes.controller.js';
import { ServicesRepository } from './service.repository.js';
import { ServicesService } from './service.service.js';
import { WorkerServiceQuotesController } from './worker-service-quotes.controller.js';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [
    WorkerServiceQuotesController,
    ClientServiceQuotesController,
  ],
  providers: [ServicesService, ServicesRepository],
})
export class ServicesModule {}