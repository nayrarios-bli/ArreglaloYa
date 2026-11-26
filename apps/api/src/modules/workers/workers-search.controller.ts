
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard.js';

import { WorkersService } from './workers.service.js';
import { SearchWorkersDto } from './dto/search-workers.dto.js';

@Controller('workers')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('client')
export class WorkersSearchController {
  constructor(
    private readonly workersService: WorkersService,
  ) {}

  @Get('search')
  searchWorkers(
    @Query() filters: SearchWorkersDto,
  ) {
    return this.workersService.searchWorkers(filters);
  }
}
