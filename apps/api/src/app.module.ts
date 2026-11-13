import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [SupabaseModule, CatalogModule, RequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
