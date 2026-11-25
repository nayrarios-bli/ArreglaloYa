import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateOfferDto } from './create-offer.dto.js';

describe('CreateOfferDto', () => {
  it('accepts a valid offer and trims its message', async () => {
    const dto = plainToInstance(CreateOfferDto, {
      estimatedAmount: 250.5,
      requiresVisit: false,
      message: '  Puedo atender el trabajo.  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.message).toBe('Puedo atender el trabajo.');
  });

  it('rejects invalid amounts and non-boolean visit responses', async () => {
    const dto = plainToInstance(CreateOfferDto, {
      estimatedAmount: -1,
      requiresVisit: 'false',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['estimatedAmount', 'requiresVisit']),
    );
  });

  it('rejects an amount outside the offers table precision', async () => {
    const dto = plainToInstance(CreateOfferDto, {
      estimatedAmount: 10_000_000_000,
      requiresVisit: true,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'estimatedAmount')).toBe(true);
  });

  it('rejects null and overlong messages', async () => {
    const nullMessage = plainToInstance(CreateOfferDto, {
      estimatedAmount: 10,
      requiresVisit: true,
      message: null,
    });
    const longMessage = plainToInstance(CreateOfferDto, {
      estimatedAmount: 10,
      requiresVisit: true,
      message: 'x'.repeat(1001),
    });

    expect((await validate(nullMessage)).some((error) => error.property === 'message')).toBe(true);
    expect((await validate(longMessage)).some((error) => error.property === 'message')).toBe(true);
  });
});
