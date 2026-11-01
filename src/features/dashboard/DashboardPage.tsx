import { useMemo, useState } from 'react';
import { useFinance } from '../../data/hooks/useSnapshot';
import { dataSource } from '../../data/sources';
import { endOfMonth, startOfMonth } from '../../lib/dates';
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

/**
 * Painel em grade de widgets:
 * 1. Disponível + 4 números (degradê) · anel de comprometimento
 * 2. Grade de ícones por categoria
 * 3. Fluxo de pagamentos (área) · próximos pagamentos
 * 4. Onde o dinheiro vai (barras) · alertas
 * 5. Orçado × contratado
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

  if (!data || !period || !cashflow) return <div className="py-24 text-center text-ink-muted">Carregando…</div>;
  const { snapshot, finance } = data;
  const periodLabel = PERIOD_LABELS[preset];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink-muted">Olá, Bia e Vini</p>
          <h1 className="page-title">Visão geral</h1>
        </div>
        <PeriodFilter
          value={preset}
          onChange={(p) => {
            setPreset(p);
            if (p === 'custom' && !custom.from) setCustom({ from: period.from, to: period.to });
          }}
          custom={custom.from ? custom : { from: period.from, to: period.to }}
          onCustomChange={setCustom}
        />
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <HeroCard finance={finance} wedding={snapshot.wedding} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <CommitmentRing finance={finance} alertPct={snapshot.wedding.overallAlertPct} />
        </div>
      </div>

      <CategoryGrid finance={finance} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <CashflowChart cashflow={cashflow} periodLabel={periodLabel} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <UpcomingPayments finance={finance} snapshot={snapshot} to={period.to} periodLabel={periodLabel} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <CategorySpend categories={finance.categories} totalContracted={finance.totals.contracted} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <AlertsPanel alerts={finance.alerts} />
        </div>
      </div>

      <BudgetVsContracted categories={finance.categories} />

      {dataSource.kind === 'mock' && (
        <p className="pt-1 text-center text-[11.5px] text-ink-faint">Dados de exemplo para validação · números calculados a partir de contratos, parcelas e pagamentos</p>
      )}
    </div>
  );
}
