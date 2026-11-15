
import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

import { SupabaseAuthGuard } from './guards/supabase-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { WorkerStatusGuard } from './guards/worker-status.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthGuard,
    RolesGuard,
    WorkerStatusGuard,
  ],
  exports: [
    SupabaseAuthGuard,
    RolesGuard,
    WorkerStatusGuard,
  ],
})
export class AuthModule {}
