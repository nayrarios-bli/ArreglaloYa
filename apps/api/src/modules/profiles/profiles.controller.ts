import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { ProfilesService } from './profiles.service.js';
import { UpdateProfileDto } from './profiles.dto.js';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':id')
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.getPublicProfile(id);
  }

  @Get('me/private-address')
  @UseGuards(SupabaseAuthGuard)
  getPrivateAddress(@Req() request: AuthenticatedRequest) {
    return this.profilesService.getPrivateAddress(request.user.id);
  }

  @Get('clients/:id/private-address')
  @UseGuards(SupabaseAuthGuard)
  getClientAddress(
    @Param('id', ParseUUIDPipe) clientId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.profilesService.getClientAddressForWorker(clientId, request.user.id);
  }

  @Put('me')
  @UseGuards(SupabaseAuthGuard)
  update(@Req() request: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(request.user.id, dto);
  }
}
