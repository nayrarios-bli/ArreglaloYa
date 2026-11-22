
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../database/supabase.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';

interface AdminProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  created_at: string;
}

@Injectable()
export class SuperadminService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  private get supabase() {
    return this.supabaseService.admin;
  }

  // =====================================================
  // VERIFICAR QUE EL USUARIO SEA ADMINISTRADOR
  // =====================================================

  private async findAdmin(id: string): Promise<AdminProfile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .eq('id', id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(
        'No se encontró el administrador solicitado.',
      );
    }

    return data as AdminProfile;
  }

  // =====================================================
  // COMPROBAR SI UNA CUENTA ESTA ACTIVA
  // =====================================================

  private isUserActive(bannedUntil?: string | null): boolean {
    if (!bannedUntil) {
      return true;
    }

    return new Date(bannedUntil).getTime() <= Date.now();
  }

  // =====================================================
  // CREAR UNA CUENTA DE ADMINISTRADOR
  // =====================================================

  async createAdmin(dto: CreateAdminDto) {
    // 1. Crear inicialmente una cuenta de cliente.
    const { data, error } =
      await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,

        user_metadata: {
          role: 'client',
          full_name: dto.fullName,
          phone: dto.phone ?? null,
        },
      });

    if (error) {
      const message = error.message.toLowerCase();

      if (
        message.includes('already') ||
        message.includes('registered') ||
        message.includes('exists')
      ) {
        throw new ConflictException(
          'Ya existe una cuenta con ese correo electrónico.',
        );
      }

      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException(
        'Supabase no devolvió información del usuario creado.',
      );
    }

    const userId = data.user.id;

    // 2. Asignar los metadatos administrativos.
    const { error: metadataError } =
      await this.supabase.auth.admin.updateUserById(
        userId,
        {
          app_metadata: {
            role: 'admin',
            provisioned_by: 'superadmin',
          },
        },
      );

    if (metadataError) {
      throw new BadRequestException(
        `La cuenta se creó, pero no se pudieron actualizar sus metadatos. ID: ${userId}. ${metadataError.message}`,
      );
    }

    // 3. Convertir el perfil de cliente en administrador.
    const { error: provisionError } =
      await this.supabase.rpc('provision_admin', {
        p_user_id: userId,
      });

    if (provisionError) {
      throw new BadRequestException(
        `La cuenta se creó, pero no se pudo convertir en administrador. ID: ${userId}. ${provisionError.message}`,
      );
    }

    // 4. Verificar el perfil final.
    const { data: profile, error: profileError } =
      await this.supabase
        .from('profiles')
        .select('id, full_name, phone, role')
        .eq('id', userId)
        .maybeSingle();

    if (profileError) {
      throw new BadRequestException(
        `No se pudo verificar el administrador. ID: ${userId}. ${profileError.message}`,
      );
    }

    if (!profile || profile.role !== 'admin') {
      throw new BadRequestException(
        `El perfil no terminó con rol admin. ID: ${userId}. Revisa Supabase antes de continuar.`,
      );
    }

    // 5. Devolver el administrador creado.
    return {
      message: 'Administrador creado correctamente.',
      admin: {
        id: profile.id,
        email: data.user.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role,
      },
    };
  }

  // =====================================================
  // LISTAR LAS CUENTAS DE ADMINISTRADORES
  // =====================================================

  async getAdmins() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const admins = (data ?? []) as AdminProfile[];

    const result = await Promise.all(
      admins.map(async (admin: AdminProfile) => {
        const { data: authData, error: authError } =
          await this.supabase.auth.admin.getUserById(admin.id);

        if (authError) {
          throw new BadRequestException(authError.message);
        }

        return {
          ...admin,
          email: authData.user.email,
          isActive: this.isUserActive(
            authData.user.banned_until,
          ),
        };
      }),
    );

    return result;
  }

  // =====================================================
  // CONSULTAR UN ADMINISTRADOR POR SU ID
  // =====================================================

  async getAdminById(id: string) {
    const admin = await this.findAdmin(id);

    const { data, error } =
      await this.supabase.auth.admin.getUserById(id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      ...admin,
      email: data.user.email,
      isActive: this.isUserActive(data.user.banned_until),
    };
  }

  // =====================================================
  // ACTUALIZAR LOS DATOS DE UN ADMINISTRADOR
  // =====================================================


  // ACTUALIZAR LOS DATOS DE UN ADMINISTRADOR
  async updateAdmin(id: string, dto: UpdateAdminDto) {
    await this.findAdmin(id);

    const authUpdates: {
      email?: string;
      email_confirm?: boolean;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    // 1. Preparar cambios de correo y contraseña.
    if (dto.email !== undefined) {
      authUpdates.email = dto.email;
      authUpdates.email_confirm = true;
    }

    if (dto.password !== undefined) {
      authUpdates.password = dto.password;
    }

    // 2. Actualizar los metadatos si cambia el nombre o teléfono.
    if (
      dto.fullName !== undefined ||
      dto.phone !== undefined
    ) {
      const { data: authData, error: authError } =
        await this.supabase.auth.admin.getUserById(id);

      if (authError || !authData.user) {
        throw new BadRequestException(
          'No se pudieron consultar los datos de autenticación del administrador.',
        );
      }

      const currentMetadata =
        authData.user.user_metadata ?? {};

      authUpdates.user_metadata = {
        ...currentMetadata,
      };

      if (dto.fullName !== undefined) {
        authUpdates.user_metadata.full_name = dto.fullName;
      }

      if (dto.phone !== undefined) {
        authUpdates.user_metadata.phone = dto.phone;
      }
    }

    // 3. Actualizar Supabase Auth.
    if (Object.keys(authUpdates).length > 0) {
      const { error } =
        await this.supabase.auth.admin.updateUserById(
          id,
          authUpdates,
        );

      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    // 4. Preparar cambios del perfil.
    const profileUpdates: {
      full_name?: string;
      phone?: string;
    } = {};

    if (dto.fullName !== undefined) {
      profileUpdates.full_name = dto.fullName;
    }

    if (dto.phone !== undefined) {
      profileUpdates.phone = dto.phone;
    }

    // 5. Actualizar la tabla profiles.
    if (Object.keys(profileUpdates).length > 0) {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id)
        .eq('role', 'admin')
        .select('id')
        .maybeSingle();

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data) {
        throw new NotFoundException(
          'No se encontró el perfil del administrador para actualizar.',
        );
      }
    }

    // 6. Devolver los datos actualizados.
    return {
      message: 'Administrador actualizado correctamente.',
      admin: await this.getAdminById(id),
    };
  }


  // =====================================================
  // DESACTIVAR UNA CUENTA DE ADMINISTRADOR
  // =====================================================

  async deactivateAdmin(
    id: string,
    superadminId: string,
  ) {
    if (id === superadminId) {
      throw new ForbiddenException(
        'No puedes desactivar tu propia cuenta.',
      );
    }

    await this.findAdmin(id);

    const { error } =
      await this.supabase.auth.admin.updateUserById(
        id,
        {
          ban_duration: '876000h',
        },
      );

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Administrador desactivado correctamente.',
    };
  }

  // =====================================================
  // REACTIVAR UNA CUENTA DE ADMINISTRADOR
  // =====================================================

  async activateAdmin(id: string) {
    await this.findAdmin(id);

    const { error } =
      await this.supabase.auth.admin.updateUserById(
        id,
        {
          ban_duration: 'none',
        },
      );

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Administrador reactivado correctamente.',
    };
  }
}
