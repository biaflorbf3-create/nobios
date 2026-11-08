import { ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useFinance } from '../../data/hooks/useSnapshot';
import { dataSource } from '../../data/sources';
import { addMonths, endOfMonth, startOfMonth } from '../../lib/dates';
import { PERIOD_LABELS, resolvePeriod, type PeriodPreset } from '../../lib/period';
import { PeriodFilter } from '../../ui/PeriodFilter';
import { AlertsPanel } from './components/AlertsPanel';
import { BudgetVsContracted } from './components/BudgetVsContracted';
import { CashflowChart } from './components/CashflowChart';
import { CategoryGrid } from './components/CategoryGrid';
import { CategorySpend } from './components/CategorySpend';
import { CommitmentRing } from './components/CommitmentRing';
import { HeroCard } from './components/HeroCard';
import { UpcomingPayments } from './components/UpcomingPayments';
import { layoutRows, normalizeOrder, type BlockId } from './blocks';
import { OrganizeSheet } from './OrganizeSheet';

/**
 * Painel em grade de blocos. A ordem é do casal (salva em wedding.dashboardOrder);
 * a ordem padrão é: disponível · comprometido / categorias / fluxo · próximos /
 * onde o dinheiro vai · alertas / orçado × contratado.
 */
export function DashboardPage() {
  const data = useFinance();
  const [preset, setPreset] = useState<PeriodPreset>('6m');
  const [custom, setCustom] = useState(() => ({ from: '', to: '' }));

  const period = useMemo(() => {
    if (!data) return null;
    const { today } = data.finance;
    const c = custom.from ? custom : { from: startOfMonth(today), to: endOfMonth(data.snapshot.wedding.weddingDate) };
    return resolvePeriod(preset, today, data.snapshot.wedding.weddingDate, c);
  }, [data, preset, custom]);
  const cashflow = useMemo(() => (data && period ? data.finance.cashflow(period.from, period.to) : null), [data, period]);
  // o gráfico também mostra o passado (até 6 meses, desde o 1º pagamento) para a linha do que já foi pago
  const chart = useMemo(() => {
    if (!data || !period) return null;
    const first = data.snapshot.payments.reduce<string | null>((min, p) => (!min || p.paidAt < min ? p.paidAt : min), null);
    const limit = addMonths(period.from, -6);
    const from = first && first < period.from ? startOfMonth(first < limit ? limit : first) : period.from;
    return data.finance.cashflow(from, period.to);
  }, [data, period]);
  const [organizing, setOrganizing] = useState(false);

  if (!data || !period || !cashflow || !chart) return <div className="py-24 text-center text-ink-muted">Carregando…</div>;
  const { snapshot, finance } = data;
  const periodLabel = PERIOD_LABELS[preset];
  const blocks: Record<BlockId, ReactNode> = {
    hero: <HeroCard finance={finance} wedding={snapshot.wedding} />,
    ring: <CommitmentRing finance={finance} alertPct={snapshot.wedding.overallAlertPct} />,
    categories: <CategoryGrid finance={finance} />,
    cashflow: <CashflowChart cashflow={cashflow} chart={chart} periodLabel={periodLabel} />,
    upcoming: <UpcomingPayments finance={finance} snapshot={snapshot} to={period.to} periodLabel={periodLabel} />,
    spend: <CategorySpend categories={finance.categories} totalContracted={finance.totals.contracted} />,
    alerts: <AlertsPanel alerts={finance.alerts} />,
    budget: <BudgetVsContracted categories={finance.categories} />,
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink-muted">Olá, Bia e Vini</p>
          <h1 className="page-title">Visão geral</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOrganizing(true)}
          aria-label="Organizar painel"
          title="Organizar painel"
          className="glass order-last flex h-10 w-10 items-center justify-center rounded-full text-ink-muted shadow-card hover:text-accent lg:order-first"
        >
          <ArrowUpDown size={16} aria-hidden />
        </button>
        <PeriodFilter
          value={preset}
          onChange={(p) => {
            setPreset(p);
            if (p === 'custom' && !custom.from) setCustom({ from: period.from, to: period.to });
          }}
          custom={custom.from ? custom : { from: period.from, to: period.to }}
          onCustomChange={setCustom}
        />
        </div>
      </header>

      {layoutRows(normalizeOrder(snapshot.wedding.dashboardOrder)).map((row) => (
        <div key={row.map((b) => b.id).join('+')} className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {row.map((b) => (
            <div key={b.id} className={`min-w-0 ${SPAN[b.span] ?? 'xl:col-span-12'}`}>
              {blocks[b.id]}
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-center pt-1">
        <button onClick={() => setOrganizing(true)} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-ink-soft shadow-card hover:text-accent">
          <ArrowUpDown size={14} aria-hidden /> Organizar painel
        </button>
      </div>
      <OrganizeSheet open={organizing} onClose={() => setOrganizing(false)} wedding={snapshot.wedding} />

      {dataSource.kind === 'mock' && (
        <p className="pt-1 text-center text-[11.5px] text-ink-faint">Dados de exemplo para validação · números calculados a partir de contratos, parcelas e pagamentos</p>
      )}
    </div>
  );
}

/** classes completas para o Tailwind encontrar */
const SPAN: Record<number, string> = {
  4: 'xl:col-span-4',
  5: 'xl:col-span-5',
  6: 'xl:col-span-6',
  7: 'xl:col-span-7',
  8: 'xl:col-span-8',
  12: 'xl:col-span-12',
};
