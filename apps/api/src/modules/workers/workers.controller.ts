
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('me/documents/:documentType')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  uploadDocument(
    @Req() request: AuthenticatedRequest,
    @Param('documentType') documentType: string,
    @UploadedFile() file: UploadedWorkerDocument | undefined,
  ) {
    return this.workersService.uploadDocument(
      request.user.id,
      documentType,
      file,
    );
  }
}

interface UploadedWorkerDocument {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
