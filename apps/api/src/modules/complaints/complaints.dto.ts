import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateComplaintDto {
  @IsUUID()
  serviceId!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(3000)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  description!: string;
}
