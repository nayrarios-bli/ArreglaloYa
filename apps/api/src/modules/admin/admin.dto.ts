import { IsDateString, IsOptional } from 'class-validator';

export class FilterAdminReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
