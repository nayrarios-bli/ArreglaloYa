
import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ClientProfileService } from './client-profile.service.js';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto.js';

import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

@Controller('client')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('client')
export class ClientProfileController {
  constructor(
    private readonly clientProfileService: ClientProfileService,
  ) {}

  // CONSULTAR PERFIL DEL CLIENTE
  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.clientProfileService.getProfile(req.user.id);
  }

  // CONSULTAR ZONAS ACTIVAS
  @Get('zones')
  getZones() {
    return this.clientProfileService.getZones();
  }

  // ACTUALIZAR PERFIL DEL CLIENTE
  @Patch('profile')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdateClientProfileDto,
  ) {
    return this.clientProfileService.updateProfile(
      req.user.id,
      updateDto,
    );
  }
}
