import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { listDays, resolveRange, toBoliviaDay } from './report-range.js';

const TODAY = '2026-11-26';

describe('resolveRange', () => {
  it('usa los últimos 30 días cuando no se envían fechas', () => {
    const range = resolveRange(undefined, undefined, TODAY);

    expect(range.startDate).toBe('2026-10-28');
    expect(range.endDate).toBe(TODAY);
    expect(listDays(range)).toHaveLength(30);
  });

  it('convierte el período a UTC según la hora de Bolivia', () => {
    const range = resolveRange('2026-11-01', '2026-11-01', TODAY);

    expect(range.startIso).toBe('2026-11-01T04:00:00.000Z');
    expect(range.endIso).toBe('2026-11-02T03:59:59.999Z');
  });

  it('rechaza una fecha inicial posterior a la final', () => {
    expect(() => resolveRange('2026-11-20', '2026-11-10', TODAY)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza fechas futuras', () => {
    expect(() => resolveRange('2026-11-01', '2026-12-01', TODAY)).toThrow(
      'La fecha final no puede ser posterior a hoy.',
    );
  });

  it('rechaza fechas que no existen', () => {
    expect(() => resolveRange('2026-02-31', '2026-03-05', TODAY)).toThrow(
      'La fecha inicial no es una fecha válida.',
    );
  });

  it('rechaza períodos de más de 366 días', () => {
    expect(() => resolveRange('2025-01-01', '2026-11-26', TODAY)).toThrow(
      'El período no puede superar 366 días.',
    );
  });
});

describe('toBoliviaDay', () => {
  it('asigna al día anterior una hora UTC de madrugada', () => {
    expect(toBoliviaDay('2026-11-10T02:00:00.000Z')).toBe('2026-11-09');
  });
});
