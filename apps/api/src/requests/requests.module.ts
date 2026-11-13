import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { RequestsController } from './requests.controller.js';
import { RequestsService } from './requests.service.js';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, SupabaseAuthGuard, RolesGuard],
})
export class RequestsModule {}
