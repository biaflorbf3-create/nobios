import type { Cents, ISODate, Payment } from '../types';
import { monthKey, monthRange } from '../../lib/dates';
import type { InstallmentView } from './installments';

export interface CashflowMonth {
  key: string; // 'AAAA-MM'
  /** já pago no mês (pagamentos registrados com data no mês) */
  paid: Cents;
  /** ainda a pagar com vencimento no mês (não vencido) */
  due: Cents;
  isCurrent: boolean;
}

export interface Cashflow {
  months: CashflowMonth[];
  /** restante de parcelas vencidas antes de hoje — fica fora dos meses, sempre visível */
  overdue: Cents;
  /** valor contratado sem parcela cadastrada */
  unscheduled: Cents;
  /** total a pagar no período (sem vencidos) */
  dueInPeriod: Cents;
  paidInPeriod: Cents;
  peakMonth: CashflowMonth | null;
}

/**
 * Pagamentos futuros por mês = Σ restante das parcelas não pagas agrupadas pelo vencimento.
 * Vencidos ficam num balde próprio, para não sumirem quando o período começa no futuro.
 */
export function buildCashflow(
  installments: InstallmentView[],
  payments: Payment[],
  activeContractIds: Set<string>,
  unscheduled: Cents,
  from: ISODate,
  to: ISODate,
  today: ISODate,
): Cashflow {
  const keys = monthRange(from, to);
  const index = new Map(keys.map((k) => [k, { key: k, paid: 0, due: 0, isCurrent: k === monthKey(today) }]));
  let overdue = 0;

  for (const v of installments) {
    if (!activeContractIds.has(v.contract.id) || v.remaining <= 0) continue;
    if (v.installment.dueDate < today) {
      overdue += v.remaining;
      continue;
    }
    const m = index.get(monthKey(v.installment.dueDate));
    if (m && v.installment.dueDate <= to) m.due += v.remaining;
  }

  for (const p of payments) {
    if (p.paidAt < from || p.paidAt > to) continue;
    const m = index.get(monthKey(p.paidAt));
    if (m) m.paid += p.amount;
  }

  const months = [...index.values()];
  const dueInPeriod = months.reduce((s, m) => s + m.due, 0);
  const paidInPeriod = months.reduce((s, m) => s + m.paid, 0);
  const peakMonth = months.reduce<CashflowMonth | null>((best, m) => (m.due > (best?.due ?? 0) ? m : best), null);

  return { months, overdue, unscheduled, dueInPeriod, paidInPeriod, peakMonth };
}
