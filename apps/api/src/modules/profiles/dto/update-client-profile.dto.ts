
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateClientProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @MinLength(3, {
    message: 'El nombre debe tener al menos 3 caracteres.',
  })
  @MaxLength(100, {
    message: 'El nombre no puede superar los 100 caracteres.',
  })
  fullName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString({ message: 'El celular debe ser un texto.' })
  @Matches(/^[0-9]{7,15}$/, {
    message: 'El celular debe contener entre 7 y 15 dígitos.',
  })
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4', {
    message: 'La zona seleccionada no tiene un identificador válido.',
  })
  homeZoneId?: string;
}
