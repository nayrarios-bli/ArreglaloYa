import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module.js';
import { OffersController } from './offers.controller.js';
import { OffersRepository } from './offers.repository.js';
import { OffersService } from './offers.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [OffersController],
  providers: [OffersService, OffersRepository],
})
export class OffersModule {}