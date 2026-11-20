import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseModule } from './database/supabase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ComplaintsModule } from './modules/complaints/complaints.module.js';

@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
  }),
  SupabaseModule,
  AuthModule,
  ComplaintsModule,
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
