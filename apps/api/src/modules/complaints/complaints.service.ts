import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateComplaintDto } from './complaints.dto.js';
import { Complaint } from './complaints.entity.js';

@Injectable()
export class ComplaintsService {
  private complaints: Complaint[] = [];

  create(createComplaintDto: CreateComplaintDto) {
    // Validar que el usuario no haya enviado ya un reclamo abierto para el mismo servicio
    const existingComplaint = this.complaints.find(
      (c) =>
        c.serviceId === createComplaintDto.serviceId &&
        c.complainantId === createComplaintDto.complainantId &&
        c.status === 'PENDING',
    );

    if (existingComplaint) {
      throw new BadRequestException(
        'Ya tienes un reclamo pendiente registrado para este servicio.',
      );
    }

    const newComplaint: Complaint = {
      id: Date.now().toString(),
      ...createComplaintDto,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.complaints.push(newComplaint);

    return {
      message: 'Reclamo registrado con éxito (HU-11)',
      complaint: newComplaint,
    };
  }

  findAll() {
    return this.complaints;
  }

  findByUser(userId: string) {
    return this.complaints.filter(
      (c) => c.complainantId === userId || c.accusedUserId === userId,
    );
  }
}