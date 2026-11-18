import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { SupabaseModule } from './database/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { ComplaintsModule } from './modules/complaints/complaints.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { ProfilesModule } from './modules/profiles/profiles.module.js'

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
    ComplaintsModule,
    AdminModule,
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}