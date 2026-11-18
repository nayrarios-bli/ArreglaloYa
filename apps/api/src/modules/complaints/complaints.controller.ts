import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ComplaintsService } from './complaints.service.js';
import { CreateComplaintDto } from './complaints.dto.js';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  create(@Body() createComplaintDto: CreateComplaintDto) {
    return this.complaintsService.create(createComplaintDto);
  }

  @Get()
  findAll() {
    return this.complaintsService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.complaintsService.findByUser(userId);
  }
}