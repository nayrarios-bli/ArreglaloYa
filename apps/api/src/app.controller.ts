
import {
  Controller,
  Get,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { AppService } from './app.service.js';
import { SupabaseService } from './database/supabase.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  getHello(@Res() res: Response) {
    return res.redirect(
      `${process.env.WEB_ORIGIN ?? 'http://localhost:4200'}/login`,
    );
  }

  @Get('health/supabase')
  async checkSupabase() {
    const { error } = await this.supabaseService.admin
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return {
        connected: false,
        message: 'No se pudo consultar la tabla profiles.',
      };
    }

    return {
      connected: true,
      message: 'Conexión con Supabase exitosa.',
    };
  }
}
