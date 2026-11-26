import { IsOptional, IsUUID, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Datos que el administrador envía para generar un reporte.
// Si no envía fechas, el servicio usa los últimos 30 días.
export class ServiceReportQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'La fecha inicial debe tener el formato AAAA-MM-DD.',
  })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'La fecha final debe tener el formato AAAA-MM-DD.',
  })
  endDate?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'La categoría no es válida.' })
  categoryId?: string;
}
