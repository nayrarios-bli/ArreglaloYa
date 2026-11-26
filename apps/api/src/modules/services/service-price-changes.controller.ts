import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsPositive, IsString, Length } from 'class-validator';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';
import { ServicePriceChangesService } from './service-price-changes.service.js';

class RequestPriceChangeDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Ingresa un monto con hasta dos decimales.' })
  @IsPositive({ message: 'El aumento debe ser mayor a cero.' })
  amount!: number;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Ingresa una justificación.' })
  @Length(10, 500, { message: 'La justificación debe tener entre 10 y 500 caracteres.' })
  reason!: string;
}

class DecidePriceChangeDto {
  @IsBoolean({ message: 'Indica si apruebas el aumento.' })
  approve!: boolean;
}

type AuthRequest = Request & { user: { id: string } };

@Controller('services/:serviceId/price-changes')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ServicePriceChangesController {
  constructor(private readonly changes: ServicePriceChangesService) {}

  @Get()
  @Roles('client', 'worker')
  list(@Req() req: AuthRequest, @Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.changes.list(serviceId, req.user.id);
  }

  @Post()
  @Roles('worker')
  request(
    @Req() req: AuthRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() input: RequestPriceChangeDto,
  ) {
    return this.changes.request(serviceId, req.user.id, input);
  }

  @Patch(':changeId')
  @Roles('client')
  decide(
    @Req() req: AuthRequest,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('changeId', ParseUUIDPipe) changeId: string,
    @Body() input: DecidePriceChangeDto,
  ) {
    return this.changes.decide(serviceId, changeId, req.user.id, input.approve);
  }
}
