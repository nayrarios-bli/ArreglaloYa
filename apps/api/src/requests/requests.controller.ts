import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { RequestsService } from './requests.service.js';

@Controller('requests')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

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
