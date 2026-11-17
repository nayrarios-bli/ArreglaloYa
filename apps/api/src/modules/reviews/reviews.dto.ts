export class CreateReviewDto {
  serviceId: string;
  clientId: string;
  workerId: string;
  rating: number;
  comment?: string;
}