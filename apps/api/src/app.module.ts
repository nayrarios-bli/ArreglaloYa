import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { SupabaseModule } from './database/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OffersModule } from './modules/offers/offers.module.js';
import { ProfilesModule } from './modules/profiles/profiles.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { WorkersModule } from './modules/workers/workers.module.js';
import { SuperadminModule } from './modules/superadmin/superadmin.module.js';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    AuthModule,
    CatalogModule,
    RequestsModule,
    ProfilesModule,
    WorkersModule,
    OffersModule,
    SuperadminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
