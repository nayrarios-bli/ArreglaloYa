
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

import { SupabaseService } from '../../../database/supabase.service.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    // 1. Obtener el token de autorización.
    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'No se proporcionó un token de autenticación.',
      );
    }

    const token = authorization.substring(7);

    // 2. Validar el token con Supabase Auth.
    const { data, error } =
      await this.supabaseService.admin.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException(
        'La sesión no es válida o ha expirado.',
      );
    }

    // 3. Consultar el estado actual de la cuenta.
    const { data: authData, error: authError } =
      await this.supabaseService.admin.auth.admin.getUserById(
        data.user.id,
      );

    if (authError || !authData.user) {
      throw new UnauthorizedException(
        'No se pudo verificar el estado de la cuenta.',
      );
    }

    // 4. Comprobar si la cuenta está bloqueada.
    const bannedUntil = authData.user.banned_until;

    if (bannedUntil) {
      const banExpiration = new Date(bannedUntil).getTime();

      if (
        !Number.isFinite(banExpiration) ||
        banExpiration > Date.now()
      ) {
        throw new ForbiddenException(
          'Tu cuenta está desactivada. No puedes acceder al sistema.',
        );
      }
    }

    // 5. Registrar el usuario autenticado en la petición.
    request.user = {
      id: authData.user.id,
      email: authData.user.email,
    };

    return true;
  }
}
