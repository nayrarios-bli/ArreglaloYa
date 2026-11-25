
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';

import { WorkersService } from './workers.service.js';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('workers')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('worker')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('me')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.workersService.getProfile(request.user.id);
  }

  @Put('me')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateWorkerProfileDto,
  ) {
    return this.workersService.updateProfile(request.user.id, body);
  }

  @Post('me/submit')
  submitForReview(@Req() request: AuthenticatedRequest) {
    return this.workersService.submitForReview(request.user.id);
  }
}
