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
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { WorkersModule } from './modules/workers/workers.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { SuperadminModule } from './modules/superadmin/superadmin.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { PaymentsModule } from './payments/payments.module.js';

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
    ReviewsModule,
    ProfilesModule,
    WorkersModule,
    AdminModule,
    OffersModule,
    SuperadminModule,
    ServicesModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
