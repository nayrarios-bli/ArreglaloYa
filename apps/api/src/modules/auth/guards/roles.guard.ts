
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  ROLES_KEY,
  AppRole,
} from '../decorators/roles.decorator.js';

import { SupabaseService } from '../../../database/supabase.service.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authUser = request.user;

    if (!authUser?.id) {
      throw new ForbiddenException(
        'No se pudo identificar al usuario.',
      );
    }

    const { data: profile, error } =
      await this.supabaseService.admin
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();

    if (error || !profile) {
      throw new ForbiddenException(
        'No se encontró el perfil del usuario.',
      );
    }

    if (!requiredRoles.includes(profile.role as AppRole)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta operación.',
      );
    }

    request.userRole = profile.role;

    return true;
  }
}
