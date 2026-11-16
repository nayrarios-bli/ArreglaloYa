
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
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

    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'No se proporcionó un token de autenticación.',
      );
    }

    const token = authorization.substring(7);

    const { data, error } =
      await this.supabaseService.admin.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException(
        'La sesión no es válida o ha expirado.',
      );
    }

    request.user = {
      id: data.user.id,
      email: data.user.email,
    };

    return true;
  }
}
