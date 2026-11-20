import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  exactAddress?: string;

  @IsOptional()
  @IsUUID()
  homeZoneId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
