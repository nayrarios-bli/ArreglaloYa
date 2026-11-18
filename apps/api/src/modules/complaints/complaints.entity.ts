export class Complaint {
  id: string;
  requestId: string;
  userId: string;
  reason: string;
  description: string;
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: Date;
}