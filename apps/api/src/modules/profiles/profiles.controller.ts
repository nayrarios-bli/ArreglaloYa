import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ProfilesService } from './profiles.service.js';
import { UpdateProfileDto } from './profiles.dto.js';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':userId/public')
  getPublicProfile(@Param('userId') userId: string) {
    return this.profilesService.getPublicProfile(userId);
  }

  @Get(':userId/authorized')
  getAuthorizedProfile(
    @Param('userId') userId: string,
    @Query('hasActiveService') hasActiveService: string,
  ) {
    const active = hasActiveService === 'true';
    return this.profilesService.getAuthorizedProfile(userId, active);
  }

  @Put(':userId')
  update(
    @Param('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.update(userId, updateProfileDto);
  }
}