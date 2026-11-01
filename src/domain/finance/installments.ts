import type { Cents, Contract, ISODate, Installment, Payment } from '../types';
import { daysBetween } from '../../lib/dates';

export type InstallmentStatus = 'paid' | 'overdue' | 'partial' | 'due-soon' | 'upcoming';

export interface InstallmentView {
  installment: Installment;
  contract: Contract;
  paid: Cents;
  remaining: Cents;
  status: InstallmentStatus;
  /** pagamento parcial (vale também para vencidas) */
  isPartial: boolean;
  /** vencimento − hoje, em dias (negativo = atrasado) */
  daysUntilDue: number;
  /** data do último pagamento, se houver */
  lastPaidAt: ISODate | null;
  payments: Payment[];
}

/**
 * Status da parcela, na ordem de prioridade:
 * Paga → Vencida → Parcial → Vence em até N dias → A vencer
 */
export function installmentStatus(
  amount: Cents,
  paid: Cents,
  dueDate: ISODate,
  today: ISODate,
  dueSoonDays: number,
): InstallmentStatus {
  if (paid >= amount) return 'paid';
  const days = daysBetween(today, dueDate);
  if (days < 0) return 'overdue';
  if (paid > 0) return 'partial';
  if (days <= dueSoonDays) return 'due-soon';
  return 'upcoming';
}

export function buildInstallmentView(
  installment: Installment,
  contract: Contract,
  payments: Payment[],
  today: ISODate,
  dueSoonDays: number,
): InstallmentView {
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, installment.amount - paid);
  const sorted = [...payments].sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  return {
    installment,
    contract,
    paid,
    remaining,
    status: installmentStatus(installment.amount, paid, installment.dueDate, today, dueSoonDays),
    isPartial: paid > 0 && paid < installment.amount,
    daysUntilDue: daysBetween(today, installment.dueDate),
    lastPaidAt: sorted.length ? sorted[sorted.length - 1].paidAt : null,
    payments: sorted,
  };
}

/** Texto curto do status, usado em selos e listas */
export function installmentStatusText(v: Pick<InstallmentView, 'status' | 'daysUntilDue' | 'isPartial'>): string {
  switch (v.status) {
    case 'paid':
      return 'Pago';
    case 'overdue': {
      const d = -v.daysUntilDue;
      const base = d === 1 ? 'Vencido há 1 dia' : `Vencido há ${d} dias`;
      return v.isPartial ? `${base} · parcial` : base;
    }
    case 'partial':
      return 'Pago parcialmente';
    case 'due-soon':
      if (v.daysUntilDue === 0) return 'Vence hoje';
      if (v.daysUntilDue === 1) return 'Vence amanhã';
      return `Vence em ${v.daysUntilDue} dias`;
    case 'upcoming':
      return 'A vencer';
  }
}
