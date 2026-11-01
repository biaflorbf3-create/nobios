import { ChevronLeft, ChevronRight, HandCoins } from 'lucide-react';
import { useMemo, useState } from 'react';
import { href } from '../../app/router';
import { installmentStatusText, type Finance, type InstallmentStatus } from '../../domain/finance';
import type { Snapshot } from '../../domain/types';
import { addDays, addMonths, endOfMonth, formatLong, formatMonthLong, monthKey, startOfMonth } from '../../lib/dates';
import { formatMoney, formatMoneyShort } from '../../lib/money';
import { Button } from '../../ui/form';
import { Money } from '../../ui/Money';
import { StatusBadge } from '../../ui/StatusBadge';
import { INSTALLMENT_TONE } from '../../ui/tones';
import { useRegisterPayment } from './PaymentContext';
import { Rings } from '../../ui/Logo';
import { buildRows, type PaymentRow } from './rows';

const WEEK = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const CHIP: Record<InstallmentStatus, string> = {
  paid: 'bg-ok/10 text-ok/80',
  overdue: 'bg-danger/10 text-danger',
  partial: 'bg-warn/10 text-warn',
  'due-soon': 'bg-warn/10 text-warn',
  upcoming: 'bg-cream text-ink',
};
const DOT: Record<InstallmentStatus, string> = {
  paid: 'bg-ok',
  overdue: 'bg-danger',
  partial: 'bg-warn',
  'due-soon': 'bg-warn',
  upcoming: 'bg-ink-soft',
};

/** Mês em grade: o que vence em cada dia. Clicar no dia mostra as parcelas e o botão Registrar. */
export function CalendarView({ snapshot, finance }: { snapshot: Snapshot; finance: Finance }) {
  const register = useRegisterPayment();
  const today = finance.today;
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState<string | null>(today);
  const rows = useMemo(() => buildRows(snapshot, finance), [snapshot, finance]);

  const key = monthKey(month);
  const byDay = new Map<string, PaymentRow[]>();
  for (const r of rows) {
    if (monthKey(r.v.installment.dueDate) !== key) continue;
    const d = r.v.installment.dueDate;
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const monthRows = [...byDay.values()].flat();
  const due = monthRows.reduce((s, r) => s + r.v.installment.amount, 0);
  const paid = monthRows.reduce((s, r) => s + r.v.paid, 0);
  const open = monthRows.reduce((s, r) => s + r.v.remaining, 0);

  // grade começando na segunda-feira
  const first = month;
  const weekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(first, -weekday);
  const last = endOfMonth(month);
  const cells: string[] = [];
  for (let d = start; d <= last || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);

  const selRows = selected && monthKey(selected) === key ? (byDay.get(selected) ?? []) : [];
  const go = (n: number) => {
    const m = addMonths(month, n);
    setMonth(m);
    setSelected(monthKey(today) === monthKey(m) ? today : ([...rows].map((r) => r.v.installment.dueDate).filter((d) => monthKey(d) === monthKey(m)).sort()[0] ?? null));
  };
  const isWeddingMonth = monthKey(snapshot.wedding.weddingDate) === key;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} aria-label="Mês anterior" className="rounded-md border border-sand p-1.5 text-ink-muted hover:text-ink">
              <ChevronLeft size={16} />
            </button>
            <h2 className="min-w-[170px] text-center text-[18px] font-bold leading-none">{cap(formatMonthLong(key))}</h2>
            <button onClick={() => go(1)} aria-label="Próximo mês" className="rounded-md border border-sand p-1.5 text-ink-muted hover:text-ink">
              <ChevronRight size={16} />
            </button>
            {key !== monthKey(today) && (
              <Button size="sm" variant="ghost" onClick={() => {
                  setMonth(startOfMonth(today));
                  setSelected(today);
                }}>
                Hoje
              </Button>
            )}
          </div>
          <div className="flex gap-5 text-[12.5px] text-ink-muted">
            <span>
              no mês <Money cents={due} size="sm" className="font-semibold text-ink" />
            </span>
            <span>
              pago <Money cents={paid} size="sm" className="text-ink" />
            </span>
            <span>
              em aberto <Money cents={open} size="sm" className="text-ink" />
            </span>
          </div>
        </header>

        <div className="grid grid-cols-7 border-t border-sand text-center">
          {WEEK.map((w) => (
            <div key={w} className="label py-2 font-medium">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-t border-sand">
          {cells.map((d) => {
            const inMonth = monthKey(d) === key;
            const items = byDay.get(d) ?? [];
            const isToday = d === today;
            const isSel = d === selected;
            const isWedding = d === snapshot.wedding.weddingDate;
            return (
              <button
                key={d}
                onClick={() => {
                  if (!inMonth) return;
                  setSelected(d);
                  if (window.innerWidth < 1024) window.setTimeout(() => document.getElementById('cal-day')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                disabled={!inMonth}
                aria-label={`${formatLong(d)}${items.length ? `: ${items.length} ${items.length === 1 ? 'pagamento' : 'pagamentos'}` : ''}`}
                aria-pressed={isSel}
                className={`relative flex min-h-[64px] flex-col items-stretch gap-1 border-b border-r border-sand/70 p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0 lg:min-h-[96px] lg:p-2 ${
                  !inMonth ? 'bg-paper/60 text-ink-faint/60' : isSel ? 'bg-cream' : 'hover:bg-cream/50'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`num flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                      isToday ? 'bg-ink font-semibold text-paper' : inMonth ? 'text-ink-soft' : ''
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {isWedding && <span title="O grande dia"><Rings width={20} color="rgb(var(--accent))" back="rgb(var(--accent-strong))" /></span>}
                </span>
                {inMonth && items.length > 0 && (
                  <>
                    {/* desktop: chips com fornecedor e valor */}
                    <span className="hidden flex-col gap-1 lg:flex">
                      {items.slice(0, 2).map((r) => (
                        <span key={r.v.installment.id} title={`${r.supplierName} · ${formatMoney(r.v.status === 'paid' ? r.v.installment.amount : r.v.remaining)}`} className={`flex flex-col rounded px-1.5 py-[3px] text-[11px] leading-[14px] ${CHIP[r.v.status]}`}>
                          <span className="truncate font-medium">{r.supplierName}</span>
                          <span className="num opacity-80">{formatMoneyShort(r.v.status === 'paid' ? r.v.installment.amount : r.v.remaining)}</span>
                        </span>
                      ))}
                      {items.length > 2 && <span className="px-1 text-[11px] text-ink-muted">+{items.length - 2}</span>}
                    </span>
                    {/* celular: pontos */}
                    <span className="flex flex-wrap gap-0.5 lg:hidden">
                      {items.map((r) => (
                        <span key={r.v.installment.id} className={`h-1.5 w-1.5 rounded-full ${DOT[r.v.status]}`} />
                      ))}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3 text-[11.5px] text-ink-muted">
          {(
            [
              ['upcoming', 'A vencer'],
              ['due-soon', 'Vence em breve'],
              ['overdue', 'Vencido'],
              ['paid', 'Pago'],
            ] as const
          ).map(([s, l]) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${DOT[s]}`} /> {l}
            </span>
          ))}
          {isWeddingMonth && (
            <span className="flex items-center gap-1.5">
              <Rings width={16} color="rgb(var(--accent))" back="rgb(var(--accent-strong))" /> casamento
            </span>
          )}
        </div>
      </section>

      {/* dia selecionado */}
      <aside id="cal-day" className="card h-fit scroll-mt-20">
        <header className="px-5 pt-4 pb-3">
          <h2 className="label">{selected && monthKey(selected) === key ? formatLong(selected) : 'Escolha um dia'}</h2>
          {selRows.length > 0 && (
            <div className="mt-1 text-[13px] text-ink-muted">
              <Money cents={selRows.reduce((s, r) => s + r.v.remaining, 0)} size="sm" className="font-medium text-ink" /> em aberto
            </div>
          )}
        </header>
        {selRows.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-ink-muted">Nenhum vencimento neste dia.</p>
        ) : (
          <ul className="divide-y divide-sand/70 border-t border-sand">
            {selRows.map((r) => (
              <li key={r.v.installment.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a href={href.supplier(r.supplierId)} className="block truncate text-[14px] font-medium hover:underline underline-offset-4">
                      {r.supplierName}
                    </a>
                    <div className="text-[12.5px] text-ink-muted">
                      {r.v.installment.label} · {r.categoryName}
                    </div>
                  </div>
                  <Money cents={r.v.status === 'paid' ? r.v.installment.amount : r.v.remaining} size="sm" className="font-medium" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusBadge tone={INSTALLMENT_TONE[r.v.status]}>{installmentStatusText(r.v)}</StatusBadge>
                  {r.v.remaining > 0 && (
                    <Button size="sm" onClick={() => register(r.v.installment.id)}>
                      <HandCoins size={13} aria-hidden /> Registrar
                    </Button>
                  )}
                </div>
                {r.v.isPartial && <div className="mt-1 text-[12px] text-warn">já pago {formatMoney(r.v.paid)}</div>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
