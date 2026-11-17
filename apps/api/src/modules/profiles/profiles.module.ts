
import { Module } from '@nestjs/common';

import { ClientProfileController } from './client-profile.controller.js';
import { ClientProfileService } from './client-profile.service.js';

@Module({
  controllers: [ClientProfileController],
  providers: [ClientProfileService],
})
export class ProfilesModule {}
