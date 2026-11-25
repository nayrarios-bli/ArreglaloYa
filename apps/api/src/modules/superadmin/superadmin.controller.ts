
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { SuperadminService } from './superadmin.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email?: string;
  };
}

@Controller('superadmin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('superadmin')
export class SuperadminController {
  constructor(
    private readonly superadminService: SuperadminService,
  ) {}

  // Crear una cuenta de administrador.
  @Post('admins')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.superadminService.createAdmin(dto);
  }

  // Listar todos los administradores.
  @Get('admins')
  getAdmins() {
    return this.superadminService.getAdmins();
  }

  // Consultar un administrador por su ID.
  @Get('admins/:id')
  getAdminById(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.superadminService.getAdminById(id);
  }

  // Actualizar los datos de un administrador.
  @Patch('admins/:id')
  updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.superadminService.updateAdmin(id, dto);
  }

  // Desactivar una cuenta de administrador.
  @Patch('admins/:id/deactivate')
  deactivateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.superadminService.deactivateAdmin(
      id,
      req.user.id,
    );
  }

  // Reactivar una cuenta de administrador.
  @Patch('admins/:id/activate')
  activateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.superadminService.activateAdmin(id);
  }
}
