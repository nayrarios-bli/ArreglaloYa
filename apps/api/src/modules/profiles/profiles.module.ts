<<<<<<< HEAD
import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';
=======

import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';
import { ClientProfileController } from './client-profile.controller.js';
import { ClientProfileService } from './client-profile.service.js';
>>>>>>> origin/main
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
<<<<<<< HEAD
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
=======
  controllers: [ClientProfileController, ProfilesController],
  providers: [ClientProfileService, ProfilesService],
  exports: [ProfilesService],
>>>>>>> origin/main
})
export class ProfilesModule {}
