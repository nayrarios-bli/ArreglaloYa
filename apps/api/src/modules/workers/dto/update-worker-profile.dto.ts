
import {
  IsArray,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkerAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startsAt!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endsAt!: string;
}

export class UpdateWorkerProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  zoneIds?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => WorkerAvailabilityDto)
  availability?: WorkerAvailabilityDto[];
}
