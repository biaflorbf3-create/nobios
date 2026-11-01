import { ArrowRight, HandCoins } from 'lucide-react';
import { href } from '../../../app/router';
import { installmentStatusText, type Finance, type InstallmentView } from '../../../domain/finance';
import type { Snapshot } from '../../../domain/types';
import { startOfMonth } from '../../../lib/dates';
import { formatMoney } from '../../../lib/money';
import { DueDateChip } from '../../../ui/DueDateChip';
import { Money } from '../../../ui/Money';
import { StatusBadge } from '../../../ui/StatusBadge';
import { INSTALLMENT_TONE } from '../../../ui/tones';
import { useRegisterPayment } from '../../payments/PaymentContext';

const LIMIT = 6;

/**
 * Próximos pagamentos no período: vencidos primeiro (sempre), depois os abertos até o fim do período.
 * Parcelas do mês atual já pagas aparecem como "Pago", para dar contexto.
 */
export function selectUpcoming(finance: Finance, to: string): InstallmentView[] {
  const monthStart = startOfMonth(finance.today);
  return finance.installments.filter((v) => {
    if (v.contract.status !== 'active') return false;
    if (v.remaining > 0) return v.status === 'overdue' || v.installment.dueDate <= to;
    return v.installment.dueDate >= monthStart && v.installment.dueDate <= to;
  });
}

export function UpcomingPayments({ finance, snapshot, to, periodLabel }: { finance: Finance; snapshot: Snapshot; to: string; periodLabel: string }) {
  const register = useRegisterPayment();
  const items = selectUpcoming(finance, to);
  const open = items.filter((v) => v.remaining > 0);
  const totalOpen = open.reduce((s, v) => s + v.remaining, 0);
  const supplier = new Map(snapshot.suppliers.map((s) => [s.id, s]));
  const category = new Map(snapshot.categories.map((c) => [c.id, c]));

  return (
    <section className="card flex h-full flex-col p-6" aria-label="Próximos pagamentos">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-[-0.01em]">Próximos pagamentos</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            <b className="num font-semibold text-ink">{formatMoney(totalOpen)}</b> em {open.length} {open.length === 1 ? 'parcela' : 'parcelas'} · {periodLabel.toLowerCase()}
          </p>
        </div>
        <a href="#pagamentos" className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline underline-offset-4">
          Ver todos <ArrowRight size={13} aria-hidden />
        </a>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-[13.5px] text-ink-muted">Nenhum pagamento no período.</p>
      ) : (
        <ul className="mt-4 flex-1 space-y-2">
          {items.slice(0, LIMIT).map((v) => {
            const s = supplier.get(v.contract.supplierId);
            const c = category.get(v.contract.categoryId);
            const paid = v.status === 'paid';
            return (
              <li key={v.installment.id} className="flex items-center gap-3 rounded-[18px] p-2 transition-colors hover:bg-cream/60">
                <DueDateChip date={v.installment.dueDate} status={v.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <a href={href.supplier(v.contract.supplierId)} className={`truncate text-[14px] font-semibold hover:underline underline-offset-4 ${paid ? 'text-ink-muted' : ''}`}>
                      {s?.name}
                    </a>
                    <Money cents={paid ? v.paid : v.remaining} size="md" tone={paid ? 'muted' : 'default'} className="shrink-0 font-bold" />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-ink-muted">
                      {v.installment.label} · {c?.name}
                    </span>
                    <StatusBadge tone={INSTALLMENT_TONE[v.status]}>{installmentStatusText(v)}</StatusBadge>
                  </div>
                </div>
                {!paid && (
                  <button
                    onClick={() => register(v.installment.id)}
                    aria-label={`Registrar pagamento ${s?.name ?? ''} ${v.installment.label}`}
                    title="Registrar pagamento"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-white"
                  >
                    <HandCoins size={16} strokeWidth={1.8} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {items.length > LIMIT && (
        <a href="#pagamentos" className="mt-2 block px-2 text-[12.5px] font-medium text-ink-muted hover:text-ink">
          + {items.length - LIMIT} {items.length - LIMIT === 1 ? 'pagamento' : 'pagamentos'} no período
        </a>
      )}
    </section>
  );
}
