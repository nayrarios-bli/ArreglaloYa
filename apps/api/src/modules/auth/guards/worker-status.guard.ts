
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { SupabaseService } from '../../../database/supabase.service.js';

@Injectable()
export class WorkerStatusGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authUser = request.user;

    if (!authUser?.id) {
      throw new ForbiddenException(
        'No se pudo identificar al usuario.',
      );
    }

    const { data: profile, error: profileError } =
      await this.supabaseService.admin
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();

    if (profileError || !profile) {
      throw new ForbiddenException(
        'No se encontró el perfil del usuario.',
      );
    }

    if (profile.role !== 'worker') {
      throw new ForbiddenException(
        'Esta operación solamente está disponible para trabajadores.',
      );
    }

    const { data: workerProfile, error: workerError } =
      await this.supabaseService.admin
        .from('worker_profiles')
        .select('review_status')
        .eq('user_id', authUser.id)
        .single();

    if (workerError || !workerProfile) {
      throw new ForbiddenException(
        'No se encontró el perfil del trabajador.',
      );
    }

    if (workerProfile.review_status !== 'approved') {
      throw new ForbiddenException(
        'Tu cuenta de trabajador todavía no está aprobada.',
      );
    }

    request.workerStatus = workerProfile.review_status;

    return true;
  }
}
