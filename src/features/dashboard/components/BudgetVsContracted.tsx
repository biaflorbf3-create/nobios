import { ArrowRight } from 'lucide-react';
import type { CategoryView } from '../../../domain/finance';
import { formatMoney, formatMoneyShort } from '../../../lib/money';
import { Card } from '../../../ui/Card';
import { StatusBadge } from '../../../ui/StatusBadge';
import { BUDGET_BAR, BUDGET_TONE } from '../../../ui/tones';
import { Empty } from './CashflowChart';

const LIMIT = 10;

/**
 * Orçado × contratado: trilho = planejado, barra = contratado na cor do estado.
 * Mostra primeiro as categorias acima ou perto do limite, depois as maiores.
 */
export function BudgetVsContracted({ categories }: { categories: CategoryView[] }) {
  const rank = { over: 0, near: 1, within: 2, unbudgeted: 3, empty: 4 } as const;
  const rows = categories
    .filter((c) => c.planned || c.contracted)
    .sort((a, b) => rank[a.state] - rank[b.state] || (b.planned ?? 0) - (a.planned ?? 0));
  const shown = rows.slice(0, LIMIT);
  const max = Math.max(...shown.map((c) => Math.max(c.planned ?? 0, c.contracted)), 1);
  const counts = {
    over: rows.filter((c) => c.state === 'over').length,
    near: rows.filter((c) => c.state === 'near').length,
  };

  return (
    <Card
      title="Orçado × contratado"
      subtitle={
        <span className="flex flex-wrap gap-1.5 pt-0.5">
          {counts.over > 0 && <StatusBadge tone="danger">{counts.over} acima</StatusBadge>}
          {counts.near > 0 && <StatusBadge tone="warn">{counts.near} perto do limite</StatusBadge>}
        </span>
      }
      action={
        <a href="#orcamento" className="flex items-center gap-1 text-[12.5px] font-medium text-ink-muted hover:text-ink">
          Todas <ArrowRight size={13} aria-hidden />
        </a>
      }
    >
      {rows.length === 0 && (
        <Empty text="Nenhum orçamento por categoria ainda." hint="Defina quanto pretendem gastar em cada categoria para comparar com o contratado." href="#orcamento" cta="Definir orçamento" />
      )}
      <ul className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-2">
        {shown.map((c) => {
          const planned = c.planned ?? 0;
          const diff = c.difference ?? 0;
          return (
            <li
              key={c.category.id}
              title={`${c.category.name}: planejado ${formatMoney(planned)}, contratado ${formatMoney(c.contracted)}`}
            >
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-1.5 font-medium">
                  {!c.hasContract && <span className="h-2 w-2 rounded-full border border-ink-faint" aria-label="ainda não contratado" />}
                  {c.category.name}
                </span>
                <span className="num text-[12.5px] text-ink-muted">
                  {c.hasContract ? (
                    <>
                      <span className="font-medium text-ink">{formatMoneyShort(c.contracted)}</span> / {formatMoneyShort(planned)}
                      {c.state === 'over' && <span className="ml-1.5 font-medium text-danger">− {formatMoneyShort(-diff)}</span>}
                      {c.state !== 'over' && diff > 0 && <span className="ml-1.5 text-ok">+ {formatMoneyShort(diff)}</span>}
                    </>
                  ) : (
                    <>falta contratar · {formatMoneyShort(planned)}</>
                  )}
                </span>
              </div>
              <div className="relative mt-2 h-2.5 w-full">
                <div className="absolute inset-y-0 left-0 rounded-full bg-champagne" style={{ width: `${(planned / max) * 100}%` }} />
                {c.contracted > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${(c.contracted / max) * 100}%`, background: BUDGET_BAR[c.state] }}
                  />
                )}
                {planned > 0 && c.contracted > planned && (
                  <div className="absolute -inset-y-1 w-0.5 rounded bg-ink" style={{ left: `${(planned / max) * 100}%` }} aria-hidden />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className={`mt-4 flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-muted ${rows.length ? 'flex' : 'hidden'}`}>
        <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-champagne" />Planejado</span>
        {(['within', 'near', 'over'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full" style={{ background: BUDGET_BAR[s] }} />
            {s === 'within' ? 'Dentro' : s === 'near' ? 'Perto do limite' : 'Acima'}
          </span>
        ))}
      </div>
      {rows.length > LIMIT && <p className="mt-2 text-[12px] text-ink-faint">Mostrando {LIMIT} de {rows.length} categorias.</p>}
      {/* para leitores de tela, a tabela equivalente */}
      <table className="sr-only">
        <caption>Orçado e contratado por categoria</caption>
        <thead><tr><th>Categoria</th><th>Planejado</th><th>Contratado</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.category.id}><td>{c.category.name}</td><td>{formatMoney(c.planned ?? 0)}</td><td>{formatMoney(c.contracted)}</td><td>{BUDGET_TONE[c.state]}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
