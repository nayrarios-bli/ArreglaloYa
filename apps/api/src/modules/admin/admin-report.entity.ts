export class AdminReport {
  id: string;
  reportType: 'SERVICES_SUMMARY' | 'USERS_ACTIVITY' | 'FINANCIAL_OVERVIEW';
  totalServices: number;
  activeUsers: number;
  totalComplaints: number;
  generatedAt: Date;
}