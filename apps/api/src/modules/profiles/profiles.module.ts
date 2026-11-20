
import { Module } from '@nestjs/common';

import { ClientProfileController } from './client-profile.controller.js';
import { ClientProfileService } from './client-profile.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ClientProfileController],
  providers: [ClientProfileService],
})
export class ProfilesModule {}
