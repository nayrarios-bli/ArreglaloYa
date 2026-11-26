import { BadRequestException } from '@nestjs/common';

// Bolivia usa UTC-4 todo el año (no tiene horario de verano).
const BOLIVIA_OFFSET = '-04:00';
const BOLIVIA_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;

export interface ReportRange {
  startDate: string; // AAAA-MM-DD
  endDate: string; // AAAA-MM-DD
  startIso: string; // inicio del primer día, en UTC
  endIso: string; // fin del último día, en UTC
}

// Reglas de negocio del período del reporte.
export function resolveRange(
  startInput?: string,
  endInput?: string,
  today = todayInBolivia(),
): ReportRange {
  const endDate = endInput ?? today;
  const startDate = startInput ?? shiftDays(endDate, -(DEFAULT_RANGE_DAYS - 1));

  assertRealDate(startDate, 'La fecha inicial no es una fecha válida.');
  assertRealDate(endDate, 'La fecha final no es una fecha válida.');

  if (startDate > endDate) {
    throw new BadRequestException(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );
  }
  if (endDate > today) {
    throw new BadRequestException('La fecha final no puede ser posterior a hoy.');
  }
  if (daysBetween(startDate, endDate) + 1 > MAX_RANGE_DAYS) {
    throw new BadRequestException(
      `El período no puede superar ${MAX_RANGE_DAYS} días.`,
    );
  }

  return {
    startDate,
    endDate,
    startIso: new Date(`${startDate}T00:00:00.000${BOLIVIA_OFFSET}`).toISOString(),
    endIso: new Date(`${endDate}T23:59:59.999${BOLIVIA_OFFSET}`).toISOString(),
  };
}

// Lista de días del período, para el gráfico de evolución diaria.
export function listDays(range: ReportRange): string[] {
  const days: string[] = [];
  for (let day = range.startDate; day <= range.endDate; day = shiftDays(day, 1)) {
    days.push(day);
  }
  return days;
}

// Convierte una fecha y hora guardada en la BD (UTC) al día de Bolivia.
export function toBoliviaDay(timestamp: string): string {
  return new Date(new Date(timestamp).getTime() - BOLIVIA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function todayInBolivia(): string {
  return new Date(Date.now() - BOLIVIA_OFFSET_MS).toISOString().slice(0, 10);
}

function shiftDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) /
      DAY_MS,
  );
}

// Rechaza fechas que no existen, por ejemplo 2026-02-31.
function assertRealDate(value: string, message: string): void {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(message);
  }
}
