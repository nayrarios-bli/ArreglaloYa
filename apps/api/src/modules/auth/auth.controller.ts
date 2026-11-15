
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // Comprobar conexión con Supabase
  @Get('check')
  async checkConnection() {
    return this.authService.checkConnection();
  }

  // Registro público
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Inicio de sesión público
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
@UseGuards(SupabaseAuthGuard)
async getAuthenticatedUser() {
  return {
    message: 'Token válido. Usuario autenticado correctamente.',
  };
}
}
