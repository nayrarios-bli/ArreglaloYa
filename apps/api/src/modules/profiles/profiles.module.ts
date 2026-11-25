import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClientProfileController } from './client-profile.controller.js';
import { ClientProfileService } from './client-profile.service.js';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ClientProfileController, ProfilesController],
  providers: [ClientProfileService, ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
