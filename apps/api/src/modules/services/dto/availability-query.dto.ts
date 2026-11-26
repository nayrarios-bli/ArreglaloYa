import { IsString, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato YYYY-MM-DD.',
  })
  date!: string;
}
