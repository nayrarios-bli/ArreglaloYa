
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabaseAdmin!: SupabaseClient;
  private supabaseUrl!: string;
  private supabasePublishableKey!: string;

  constructor(
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ?? '';

    const supabaseSecretKey =
      this.configService.get<string>('SUPABASE_SECRET_KEY');

    this.supabasePublishableKey =
      this.configService.get<string>(
        'SUPABASE_PUBLISHABLE_KEY',
      ) ?? '';

    if (
      !this.supabaseUrl ||
      !supabaseSecretKey ||
      !this.supabasePublishableKey
    ) {
      throw new Error(
        'Faltan variables de configuración de Supabase.',
      );
    }

    // Conexión administrativa para operaciones del backend.
    this.supabaseAdmin = createClient(
      this.supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  // Cliente administrativo: utiliza la clave secreta.
  get admin(): SupabaseClient {
    return this.supabaseAdmin;
  }

  // Crea una conexión pública independiente para cada operación
  // de autenticación.
  createAuthClient(): SupabaseClient {
    return createClient(
      this.supabaseUrl,
      this.supabasePublishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

}
