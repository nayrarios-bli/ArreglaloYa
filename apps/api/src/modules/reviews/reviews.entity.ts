export class Review {
  id: string;
  serviceId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number;
  comment?: string;
  roleType: 'CLIENT_TO_WORKER' | 'WORKER_TO_CLIENT';
  createdAt: Date;
}