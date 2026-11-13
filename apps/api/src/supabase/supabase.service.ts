import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AppRole = 'client' | 'worker' | 'admin' | 'superadmin';

export interface AuthenticatedUser {
  id: string;
  role: AppRole;
}

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!url || !secretKey) {
      throw new Error(
        'Configura SUPABASE_URL y SUPABASE_SECRET_KEY en apps/api/.env.',
      );
    }

    this.client = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedUser> {
    const { data: authData, error: authError } =
      await this.client.auth.getUser(accessToken);

    if (authError || !authData.user) {
      throw new UnauthorizedException('La sesión no es válida o ha expirado.');
    }

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      throw new InternalServerErrorException(
        'No se pudo verificar el perfil de la cuenta.',
      );
    }

    if (!profile || !isAppRole(profile.role)) {
      throw new ForbiddenException('La cuenta aún no tiene un rol habilitado.');
    }

    return { id: authData.user.id, role: profile.role };
  }
}

function isAppRole(role: string): role is AppRole {
  return ['client', 'worker', 'admin', 'superadmin'].includes(role);
}
