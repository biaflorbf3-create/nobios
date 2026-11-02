import { ArrowRight, Check, Plus } from 'lucide-react';
import { href } from '../../../app/router';
import type { Finance } from '../../../domain/finance';
import { formatMoneyShort } from '../../../lib/money';
import { categoryIcon } from '../../../ui/categoryIcon';
import { BUDGET_BAR } from '../../../ui/tones';

/**
 * Grade de ícones por categoria (como a da referência).
 * Cada bloco diz se já está contratado (✓), quanto do planejado foi usado, ou se ainda falta contratar.
 */
export function CategoryGrid({ finance }: { finance: Finance }) {
  // esconde opcionais vazias (sem orçamento nem contrato) para a grade não ficar poluída
  const cats = finance.categories.filter((c) => c.category.need !== 'dismissed' && (c.category.need === 'required' || c.planned || c.hasContract));
  const hidden = finance.categories.filter((c) => c.category.need !== 'dismissed').length - cats.length;
  const pending = finance.pendingCategories.length;
  return (
    <section className="card p-5 sm:p-6" aria-label="Categorias">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold tracking-[-0.01em]">Categorias</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            <b className="num font-semibold text-ink">{finance.contractedSupplierCount}</b> fornecedores contratados ·{' '}
            {pending ? (
              <>
                <b className="num font-semibold text-warn">{pending}</b> {pending === 1 ? 'categoria ainda falta' : 'categorias ainda faltam'}
              </>
            ) : (
              'tudo contratado'
            )}
          </p>
        </div>
        <a href="#orcamento" className="flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline underline-offset-4">
          Ver todas <ArrowRight size={13} aria-hidden />
        </a>
      </div>
      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7">
        {cats.map((c) => {
          const Icon = categoryIcon(c.category);
          const pendingReq = c.category.need === 'required' && !c.hasContract;
          const ratio = c.planned ? Math.min(1, c.contracted / c.planned) : c.hasContract ? 1 : 0;
          return (
            <li key={c.category.id}>
              <a
                href={href.category(c.category.id)}
                className={`group relative flex h-full flex-col items-center gap-1.5 rounded-[18px] px-2 pt-3.5 pb-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-card ${
                  c.hasContract ? 'bg-accent-soft/60' : 'bg-cream/70'
                }`}
                title={c.category.name}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${
                    c.hasContract ? 'btn-grad text-white' : pendingReq ? 'bg-surface text-warn ring-1 ring-warn/30' : 'bg-surface text-ink-muted'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden />
                </span>
                {c.hasContract && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white" aria-label="contratado">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
                <span className="w-full truncate text-[12px] font-semibold text-ink">{c.category.name}</span>
                <span className={`num text-[11px] ${c.state === 'over' ? 'font-semibold text-danger' : pendingReq ? 'font-medium text-warn' : 'text-ink-muted'}`}>
                  {c.hasContract ? formatMoneyShort(c.contracted) : pendingReq ? 'falta contratar' : c.planned ? formatMoneyShort(c.planned) : '—'}
                </span>
                {c.planned ? (
                  <span className="mt-0.5 h-1 w-10 rounded-full bg-champagne" aria-hidden>
                    <span className="block h-1 rounded-full" style={{ width: `${ratio * 100}%`, background: c.hasContract ? BUDGET_BAR[c.state] : 'transparent' }} />
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
        <li>
          <a
            href="#orcamento"
            className="flex h-full min-h-[118px] flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-sand px-2 text-center text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Plus size={20} aria-hidden />
            <span className="text-[11.5px] font-semibold">{hidden ? `+${hidden} opcionais` : 'Adicionar'}</span>
          </a>
        </li>
      </ul>
    </section>
  );
}
