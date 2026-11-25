
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateAdminDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/\S/, {
    message: 'El nombre completo no puede estar vacío.',
  })
  fullName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^[0-9]{7,15}$/, {
    message: 'El teléfono debe contener entre 7 y 15 dígitos.',
  })
  phone?: string;
}
