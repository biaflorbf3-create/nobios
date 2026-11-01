import type { Cents, Contract, Installment } from '../types';
import { formatMoney } from '../../lib/money';

/**
 * O que fazer quando o valor pago é diferente do restante da parcela:
 * - exact: valor = restante
 * - partial: paga menos e o restante continua em aberto
 * - discount: paga menos e quita (a parcela e o contrato diminuem pela diferença)
 * - surcharge: paga mais (juros/multa: parcela e contrato aumentam pela diferença)
 */
export type PaymentMode = 'exact' | 'partial' | 'discount' | 'surcharge';

export function paymentMode(amount: Cents, remaining: Cents, settle: boolean): PaymentMode {
  if (amount === remaining) return 'exact';
  if (amount > remaining) return 'surcharge';
  return settle ? 'discount' : 'partial';
}

export interface PaymentPlan {
  mode: PaymentMode;
  installment?: Installment;
  contract?: Contract;
}

/** Calcula os ajustes de parcela e contrato. Nada é alterado quando o pagamento é exato ou parcial. */
export function planPayment(
  installment: Installment,
  contract: Contract,
  alreadyPaid: Cents,
  amount: Cents,
  settle: boolean,
): PaymentPlan {
  const remaining = Math.max(0, installment.amount - alreadyPaid);
  const mode = paymentMode(amount, remaining, settle);
  if (mode === 'exact' || mode === 'partial') return { mode };
  const delta = mode === 'discount' ? -(remaining - amount) : amount - remaining;
  const note = mode === 'discount' ? `Quitada com desconto de ${formatMoney(-delta)}` : `Inclui ${formatMoney(delta)} de juros/multa`;
  return {
    mode,
    installment: {
      ...installment,
      amount: installment.amount + delta,
      adjustmentNote: [installment.adjustmentNote, note].filter(Boolean).join(' · '),
    },
    contract: { ...contract, totalValue: contract.totalValue + delta },
  };
}
