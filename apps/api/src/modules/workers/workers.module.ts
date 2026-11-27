
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { WorkersController } from './workers.controller.js';
import { WorkersSearchController } from './workers-search.controller.js';
import { WorkersService } from './workers.service.js';


@Module({
  imports: [AuthModule],
  controllers: [WorkersController, WorkersSearchController ],
  providers: [WorkersService],
})
export class WorkersModule {}
