import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OffersController } from './offers.controller.js';
import { OffersRepository } from './offers.repository.js';
import { OffersService } from './offers.service.js';
import { ClientOffersController } from './client-offers.controller.js';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [OffersController, ClientOffersController],
  providers: [OffersService, OffersRepository],
})
export class OffersModule {}