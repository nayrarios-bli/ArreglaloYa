import { Injectable } from '@nestjs/common';
import { CreateComplaintDto } from './complaints.dto.js';
import { Complaint } from './complaints.entity.js';

@Injectable()
export class ComplaintsService {
  private complaints: Complaint[] = [];

  create(dto: CreateComplaintDto): Complaint {
    const newComplaint: Complaint = {
      id: Date.now().toString(),
      ...dto,
      status: 'PENDING',
      createdAt: new Date(),
    };
    this.complaints.push(newComplaint);
    return newComplaint;
  }

  findAll(): Complaint[] {
    return this.complaints;
  }
}