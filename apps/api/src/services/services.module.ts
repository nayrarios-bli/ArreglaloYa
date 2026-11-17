import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
