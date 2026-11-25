import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SupabaseService } from './database/supabase.service.js';

describe('AppController', () => {
  let appController: AppController;
  const response = { redirect: vi.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    response.redirect.mockClear();
  });

  describe('root', () => {
    it('redirects to the login page', () => {
      appController.getHello(response as unknown as Response);

      expect(response.redirect).toHaveBeenCalledWith(
        `${process.env.WEB_ORIGIN ?? 'http://localhost:4200'}/login`,
      );
    });
  });
});
