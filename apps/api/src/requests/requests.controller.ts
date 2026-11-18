import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { Roles } from '../modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '../modules/auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../modules/auth/guards/supabase-auth.guard.js';
import { RequestsService } from './requests.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('requests')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('profile-zone')
  @Roles('client')
  getProfileZone(@Req() request: AuthenticatedRequest) {
    return this.requests.getClientZone(request.user.id);
  }

  @Post()
  @Roles('client')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.requests.create(request.user.id, body);
  }

  @Post(':requestId/attachments')
  @Roles('client')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  uploadAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    return this.requests.addAttachment(request.user.id, requestId, file);
  }

}

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
