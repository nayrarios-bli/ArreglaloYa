
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import { SupabaseService } from '../../database/supabase.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  // COMPROBAR CONEXIÓN CON SUPABASE
  async checkConnection() {
    const { error } = await this.supabaseService.admin
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      throw new InternalServerErrorException(
        'No se pudo consultar Supabase.',
      );
    }

    return {
      connected: true,
      message: 'AuthService conectado con Supabase.',
    };
  }

  // REGISTRO DE USUARIO
  async register(registerDto: RegisterDto) {
    const {
      fullName,
      email,
      password,
      phone,
      role,
    } = registerDto;

    // 1. Crear conexión independiente de autenticación.
    const authClient =
      this.supabaseService.createAuthClient();

    // 2. Registrar usuario en Supabase Auth.
    const { data: authData, error: authError } =
      await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone ?? null,
            role,
          },
        },
      });

    // Supabase puede devolver un usuario ficticio sin identidades cuando
    // el correo ya existe y la confirmación de email está habilitada.
    const emailAlreadyRegistered =
      authData.user?.identities?.length === 0;

    // 3. Comprobar errores del registro.
    if (emailAlreadyRegistered) {
      throw new ConflictException(
        'Este correo electrónico ya tiene una cuenta. Inicia sesión o usa otro correo.',
      );
    }

    if (authError || !authData.user) {
      console.error(
        'Error de Supabase Auth:',
        authError?.message ??
          'No se recibió información del usuario.',
      );

      if (
        authError?.message.toLowerCase().includes('already') ||
        authError?.message.toLowerCase().includes('registered')
      ) {
        throw new ConflictException(
          'Este correo electrónico ya está registrado.',
        );
      }

      throw new BadRequestException(
        'No se pudo completar el registro. Verifica los datos e intenta nuevamente.',
      );
    }

    // 4. El trigger de Supabase crea automáticamente:
    // - profiles
    // - client_profiles, si es cliente.
    // - worker_profiles, si es trabajador.

    // 5. Devolver resultado del registro.
    return {
      message: authData.session
        ? 'Usuario registrado correctamente.'
        : 'Cuenta creada. Revisa tu correo para confirmar tu dirección antes de iniciar sesión.',
      emailConfirmationRequired: !authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
        phone: phone ?? null,
        role,
        reviewStatus: role === 'worker' ? 'pending' : null,
      },
      session: authData.session
        ? {
            accessToken: authData.session.access_token,
            refreshToken: authData.session.refresh_token,
            expiresAt: authData.session.expires_at ?? null,
          }
        : null,
    };
  }

  // INICIO DE SESIÓN
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Crear conexión independiente de autenticación.
    const authClient =
      this.supabaseService.createAuthClient();

    // 2. Verificar credenciales.
    const { data, error } =
      await authClient.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException(
        'Correo electrónico o contraseña incorrectos. Verifica también si confirmaste tu correo.',
      );
    }

    // 3. Consultar perfil del usuario.
    const { data: profile, error: profileError } =
      await this.supabaseService.admin
        .from('profiles')
        .select('id, full_name, phone, role')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profile) {
      throw new InternalServerErrorException(
        'No se encontró el perfil del usuario.',
      );
    }

    // 4. Consultar estado de aprobación si es trabajador.
    let reviewStatus: string | null = null;

    if (profile.role === 'worker') {
      const { data: workerProfile, error: workerError } =
        await this.supabaseService.admin
          .from('worker_profiles')
          .select('review_status')
          .eq('user_id', data.user.id)
          .single();

      if (workerError || !workerProfile) {
        throw new InternalServerErrorException(
          'No se encontró el perfil del trabajador.',
        );
      }

      reviewStatus = workerProfile.review_status;
    }

    // 5. Devolver información del usuario y su sesión.
    return {
      message: 'Inicio de sesión exitoso.',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role,
        reviewStatus,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    };
  }
}
