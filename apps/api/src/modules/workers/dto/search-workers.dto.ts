
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchWorkersDto {
  // Categoría del trabajador
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  // Calificación mínima entre 1 y 5
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  // 0 = domingo, 1 = lunes, ..., 6 = sábado
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  // Hora de inicio en formato HH:mm
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startsAt?: string;

  // Hora de fin en formato HH:mm
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endsAt?: string;

  // Paginación
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 6;
}
