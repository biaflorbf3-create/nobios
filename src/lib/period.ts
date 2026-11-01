import type { ISODate } from '../domain/types';
import { addDays, addMonths, endOfMonth, startOfMonth } from './dates';

export type PeriodPreset = 'month' | '3m' | '6m' | 'wedding' | 'custom';

export interface Period {
  preset: PeriodPreset;
  from: ISODate;
  to: ISODate;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  month: 'Este mês',
  '3m': 'Próximos 3 meses',
  '6m': 'Próximos 6 meses',
  wedding: 'Até o casamento',
  custom: 'Personalizado',
};

/** Períodos começam no 1º dia do mês atual: o mês corrente inteiro entra no fluxo. */
export function resolvePeriod(
  preset: PeriodPreset,
  today: ISODate,
  weddingDate: ISODate,
  custom?: { from: ISODate; to: ISODate },
): Period {
  const from = startOfMonth(today);
  switch (preset) {
    case 'month':
      return { preset, from, to: endOfMonth(today) };
    case '3m':
      return { preset, from, to: addDays(addMonths(from, 3), -1) };
    case '6m':
      return { preset, from, to: addDays(addMonths(from, 6), -1) };
    case 'wedding':
      return { preset, from, to: endOfMonth(weddingDate) };
    case 'custom':
      return { preset, from: custom?.from ?? from, to: custom?.to ?? endOfMonth(weddingDate) };
  }
}
