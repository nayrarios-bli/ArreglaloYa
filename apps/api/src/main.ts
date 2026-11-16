import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
