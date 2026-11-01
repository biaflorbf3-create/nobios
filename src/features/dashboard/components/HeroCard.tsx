import { CalendarHeart, CircleDollarSign, HandCoins, Wallet } from 'lucide-react';
import type { Finance } from '../../../domain/finance';
import type { Wedding } from '../../../domain/types';
import { formatLong } from '../../../lib/dates';
import { formatMoney, formatPct } from '../../../lib/money';

/**
 * Card principal em degradê: quanto ainda está disponível, e os outros 4 números do casamento.
 * Valores do casamento inteiro — não mudam com o filtro de período.
 */
export function HeroCard({ finance, wedding }: { finance: Finance; wedding: Wedding }) {
  const t = finance.totals;
  const over = t.available < 0;
  const openCount = finance.installments.filter((v) => v.contract.status === 'active' && v.remaining > 0).length;
  return (
    <section aria-label="Resumo financeiro" className="btn-grad relative overflow-hidden rounded-card p-6 text-white shadow-glow lg:p-7">
      {/* anéis decorativos discretos */}
      <svg className="pointer-events-none absolute -right-16 -top-20 opacity-[0.12]" width="320" height="320" viewBox="0 0 320 320" aria-hidden>
        <circle cx="160" cy="160" r="120" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="200" cy="160" r="120" fill="none" stroke="white" strokeWidth="2" />
      </svg>

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/20">
            <Wallet size={20} aria-hidden />
          </span>
          <div>
            <div className="text-[12.5px] font-medium text-white/80">{over ? 'Acima do orçamento' : 'Disponível no orçamento'}</div>
            <div className="num text-[36px] font-bold leading-none tracking-[-0.03em] lg:text-[42px]">
              {over ? '− ' : ''}
              {formatMoney(Math.abs(t.available))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-2 text-[12.5px] font-semibold backdrop-blur">
          <CalendarHeart size={15} aria-hidden />
          {finance.daysToWedding > 0 ? `Faltam ${finance.daysToWedding} dias` : finance.daysToWedding === 0 ? 'É hoje!' : 'Casados ✦'}
          <span className="hidden font-medium text-white/75 sm:inline">· {formatLong(wedding.weddingDate)}</span>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Orçamento" value={formatMoney(t.planned)} note="teto planejado" />
        <Stat label="Contratado" value={formatMoney(t.contracted)} note={`${formatPct(t.commitment)} do teto`} />
        <Stat label="Já pago" value={formatMoney(t.paid)} note={`${formatPct(t.contracted ? t.paid / t.contracted : 0)} do contratado`} icon={<HandCoins size={13} aria-hidden />} />
        <Stat label="A pagar" value={formatMoney(t.toPay)} note={`${openCount} parcelas abertas`} icon={<CircleDollarSign size={13} aria-hidden />} />
      </div>
    </section>
  );
}

function Stat({ label, value, note, icon }: { label: string; value: string; note: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] bg-white/15 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/80">
        {icon}
        {label}
      </div>
      <div className="num mt-1 text-[19px] font-bold tracking-[-0.02em]">{value}</div>
      <div className="text-[11.5px] text-white/75">{note}</div>
    </div>
  );
}
