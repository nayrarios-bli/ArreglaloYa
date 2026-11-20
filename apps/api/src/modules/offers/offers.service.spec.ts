import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { CreatedOffer, OffersRepository } from './offers.repository.js';
import { OffersService } from './offers.service.js';

const REQUEST_ID = 'b030244f-aa4b-4f56-9749-0aa419e80950';
const WORKER_ID = '898e7a63-1a4e-47f0-951d-e27975a96df5';
const CATEGORY_ID = 'c20a61dc-a903-44a4-94c0-5c7b3de8cab1';
const ZONE_ID = 'ad190525-9d10-46c6-9529-2fed9999ad41';

const createdOffer: CreatedOffer = {
  id: 'offer-id',
  request_id: REQUEST_ID,
  worker_id: WORKER_ID,
  estimated_amount: 250,
  requires_visit: false,
  message: 'Puedo atender el trabajo.',
  status: 'submitted',
  created_at: '2026-11-20T12:00:00.000Z',
};

describe('OffersService', () => {
  it('creates an offer for an approved worker with a matching open request', async () => {
    const { service, repository } = createService();

    await expect(service.createOffer(REQUEST_ID, WORKER_ID, validInput())).resolves.toEqual(createdOffer);
    expect(repository.createOffer).toHaveBeenCalledWith({
      requestId: REQUEST_ID,
      workerId: WORKER_ID,
      estimatedAmount: 250,
      requiresVisit: false,
      message: 'Puedo atender el trabajo.',
    });
  });

  it('rejects workers whose profiles are not approved', async () => {
    const { service, repository } = createService({ reviewStatus: 'pending' });

    await expect(service.createOffer(REQUEST_ID, WORKER_ID, validInput())).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.getRequest).not.toHaveBeenCalled();
  });

  it('rejects requests that already have a selected offer', async () => {
    const { service } = createService({ hasSelectedOffer: true });

    await expect(service.createOffer(REQUEST_ID, WORKER_ID, validInput())).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects requests that do not match the worker profile', async () => {
    const { service, repository } = createService({ hasCategory: false });

    await expect(service.createOffer(REQUEST_ID, WORKER_ID, validInput())).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createOffer).not.toHaveBeenCalled();
  });
});

function validInput(): CreateOfferDto {
  return {
    estimatedAmount: 250,
    requiresVisit: false,
    message: '  Puedo atender el trabajo.  ',
  };
}

function createService(options: {
  reviewStatus?: string;
  hasSelectedOffer?: boolean;
  hasCategory?: boolean;
} = {}) {
  const repository = {
    getWorkerReviewStatus: vi.fn().mockResolvedValue(options.reviewStatus ?? 'approved'),
    getRequest: vi.fn().mockResolvedValue({
      id: REQUEST_ID,
      category_id: CATEGORY_ID,
      zone_id: ZONE_ID,
      status: 'open',
      expires_at: '2099-12-31T23:59:59.000Z',
    }),
    hasSelectedOffer: vi.fn().mockResolvedValue(options.hasSelectedOffer ?? false),
    workerHasCategory: vi.fn().mockResolvedValue(options.hasCategory ?? true),
    workerHasZone: vi.fn().mockResolvedValue(true),
    createOffer: vi.fn().mockResolvedValue(createdOffer),
  };

  return {
    repository,
    service: new OffersService(repository as unknown as OffersRepository),
  };
}
