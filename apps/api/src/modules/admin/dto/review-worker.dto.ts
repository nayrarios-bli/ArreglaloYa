
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class ReviewWorkerDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
