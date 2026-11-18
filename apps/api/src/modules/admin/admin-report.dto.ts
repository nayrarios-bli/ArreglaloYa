export class FilterReportDto {
  startDate?: string;
  endDate?: string;
  reportType?: 'SERVICES_SUMMARY' | 'USERS_ACTIVITY' | 'FINANCIAL_OVERVIEW';
}