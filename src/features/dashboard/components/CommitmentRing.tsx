import { ArrowRight } from 'lucide-react';
import type { Finance } from '../../../domain/finance';
import { formatMoney, formatPct } from '../../../lib/money';
import { Ring } from '../../../ui/Ring';

/** Orçamento comprometido = CONTRATADO ÷ planejado (o anel interno mostra o que já foi pago) */
export function CommitmentRing({ finance, alertPct }: { finance: Finance; alertPct: number }) {
  const t = finance.totals;
  const over = t.commitment > 1;
  const alert = t.commitment * 100 >= alertPct;
  return (
    <section className="card flex h-full flex-col p-6" aria-label="Orçamento comprometido">
      <div className="flex items-start justify-between">
        <h2 className="text-[15px] font-bold tracking-[-0.01em]">Orçamento comprometido</h2>
      </div>
      <div className="flex flex-1 items-center gap-5 py-4">
        <Ring value={t.commitment} inner={t.planned ? t.paid / t.planned : 0} size={148} stroke={14} label={`${formatPct(t.commitment)} do orçamento comprometido`}>
          <span className={`num text-[30px] font-bold leading-none tracking-[-0.03em] ${over ? 'text-danger' : ''}`}>{formatPct(t.commitment)}</span>
          <span className="mt-1 text-[11px] font-medium text-ink-muted">contratado</span>
        </Ring>
        <ul className="min-w-0 flex-1 space-y-3 text-[12.5px]">
          <Legend color="btn-grad" label="Contratado" value={formatMoney(t.contracted)} />
          <Legend color="bg-ink-soft" label="Já pago" value={formatMoney(t.paid)} />
          <Legend color="bg-champagne" label={over ? 'Acima do teto' : 'Livre'} value={formatMoney(Math.abs(t.available))} />
        </ul>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[12px] ${alert ? 'font-semibold text-warn' : 'text-ink-muted'}`}>{alert ? `Passou de ${alertPct}%` : `de ${formatMoney(t.planned)}`}</span>
        <a href="#orcamento" className="btn-grad inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white shadow-glow hover:brightness-105">
          Ver orçamento <ArrowRight size={13} aria-hidden />
        </a>
      </div>
    </section>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <li>
      <div className="flex items-center gap-2 text-ink-muted">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-hidden />
        {label}
      </div>
      <div className="num mt-0.5 pl-[18px] text-[14px] font-bold text-ink">{value}</div>
    </li>
  );
}
