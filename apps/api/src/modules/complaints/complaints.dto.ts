export class CreateComplaintDto {
  serviceId: string;
  complainantId: string;
  accusedUserId: string;
  reason: string;
  description: string;
  evidenceUrl?: string;
}