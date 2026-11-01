import { Check, Circle, Heart, Minus, Pencil, Plus } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { href } from '../../app/router';
import { useMutate } from '../../data/hooks/useMutate';
import { useFinance } from '../../data/hooks/useSnapshot';
import { categoryRepository } from '../../data/repositories';
import type { CategoryView } from '../../domain/finance';
import type { Category, Cents, Snapshot } from '../../domain/types';
import { formatMoney, formatPct } from '../../lib/money';
import { Button, MoneyInput } from '../../ui/form';
import { Money } from '../../ui/Money';
import { StatusBadge } from '../../ui/StatusBadge';
import { BUDGET_BAR, BUDGET_LABEL, BUDGET_TONE } from '../../ui/tones';
import { CategoryForm, NEED_LABEL } from './CategoryForm';
import { categoryIcon } from '../../ui/categoryIcon';

type Filter = 'all' | 'pending' | 'over' | 'dismissed';

export function BudgetPage() {
  const data = useFinance();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Category | null | 'new'>(null);
  if (!data) return null;
  const { snapshot, finance } = data;
  const t = finance.totals;
  const cats = finance.categories;

  const match: Record<Filter, (c: CategoryView) => boolean> = {
    all: (c) => c.category.need !== 'dismissed',
    pending: (c) => c.category.need === 'required' && !c.hasContract,
    over: (c) => c.state === 'over',
    dismissed: (c) => c.category.need === 'dismissed',
  };
  const rows = cats.filter(match[filter]);
  const counts = Object.fromEntries((Object.keys(match) as Filter[]).map((k) => [k, cats.filter(match[k]).length])) as Record<Filter, number>;
  const sum = {
    planned: rows.reduce((s, c) => s + (c.planned ?? 0), 0),
    contracted: rows.reduce((s, c) => s + c.contracted, 0),
    paid: rows.reduce((s, c) => s + c.paid, 0),
  };
  const contractedDone = cats.filter((c) => c.category.need !== 'dismissed' && c.hasContract).length;
  const pending = finance.pendingCategories;
  const over = cats.filter((c) => c.state === 'over');

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Orçamento</h1>
          <p className="mt-2.5 max-w-[640px] text-[14px] leading-6 text-ink-soft">{headline(t.commitment, pending.length, over.length)}</p>
        </div>
        <Button variant="primary" onClick={() => setEditing('new')} className="self-start sm:self-auto">
          <Plus size={15} strokeWidth={2} aria-hidden /> Categoria
        </Button>
      </header>

      {/* teto × distribuição × contratado */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Teto do casamento" value={<Money cents={t.planned} size="lg" />} note={<a href="#ajustes" className="underline-offset-4 hover:underline">alterar em Ajustes</a>} />
        <Tile
          label="Distribuído nas categorias"
          value={<Money cents={t.allocated} size="lg" />}
          note={
            t.unallocated >= 0 ? (
              <>
                <b className="num font-medium text-ink">{formatMoney(t.unallocated)}</b> ainda não alocados
              </>
            ) : (
              <span className="text-danger">{formatMoney(-t.unallocated)} acima do teto</span>
            )
          }
        />
        <Tile label="Contratado" value={<Money cents={t.contracted} size="lg" />} note={<>{formatPct(t.commitment)} do teto</>} />
        <Tile
          label="Categorias contratadas"
          value={
            <span className="num text-[20px] font-semibold">
              {contractedDone} <span className="text-[14px] font-normal text-ink-muted">✓</span>{' '}
              <span className={pending.length ? 'text-warn' : ''}>{pending.length}</span> <span className="text-[14px] font-normal text-ink-muted">○</span>
            </span>
          }
          note={pending.length ? <>{pending.length} necessários sem contrato</> : <>tudo contratado</>}
        />
      </section>

      <div role="tablist" aria-label="Filtrar categorias" className="flex w-fit max-w-full overflow-x-auto glass rounded-full p-1 shadow-card">
        {(
          [
            ['all', 'Todas'],
            ['pending', 'Falta contratar'],
            ['over', 'Acima do orçamento'],
            ['dismissed', 'Dispensadas'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
              filter === id ? 'bg-accent text-white' : 'text-ink-muted hover:bg-cream hover:text-ink'
            }`}
          >
            {label}
            <span className={`num text-[11px] ${filter === id ? 'text-white/75' : 'text-ink-faint'}`}>{counts[id]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-12 text-center text-[14px] text-ink-muted">
          {filter === 'pending' ? 'Tudo o que é necessário já está contratado. ✓' : filter === 'over' ? 'Nenhuma categoria acima do orçamento.' : 'Nenhuma categoria aqui.'}
        </div>
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-sand text-left">
                  <th className="w-10" />
                  <Th>Categoria</Th>
                  <Th right>Planejado</Th>
                  <Th right>Contratado</Th>
                  <Th right>Diferença</Th>
                  <Th className="w-[200px]">Estado</Th>
                  <Th>Fornecedor</Th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.category.id} className="group border-b border-sand/70 last:border-0 hover:bg-cream/40">
                    <td className="pl-4"><NeedIcon c={c} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CatIcon c={c} />
                        <div>
                          <a href={href.category(c.category.id)} className="font-semibold hover:underline underline-offset-4">{c.category.name}</a>
                          <div className="text-[12px] text-ink-muted">{NEED_LABEL[c.category.need]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.category.need === 'dismissed' ? <span className="text-ink-faint">—</span> : <PlannedCell category={c.category} />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.contracted ? <Money cents={c.contracted} size="sm" className="font-medium" /> : <span className="text-ink-faint">—</span>}
                      {c.paid > 0 && <div className="text-[11.5px] text-ink-muted">pago {formatMoney(c.paid)}</div>}
                    </td>
                    <td className="px-4 py-3 text-right"><Diff c={c} /></td>
                    <td className="px-4 py-3"><StateCell c={c} /></td>
                    <td className="px-4 py-3"><SupplierCell c={c} snapshot={snapshot} /></td>
                    <td className="pr-3">
                      <button aria-label={`Editar ${c.category.name}`} onClick={() => setEditing(c.category)} className="rounded-md p-1.5 text-ink-faint hover:bg-cream hover:text-ink">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filter !== 'dismissed' && (
                <tfoot>
                  <tr className="border-t border-sand bg-cream/40 text-[13px]">
                    <td />
                    <td className="px-4 py-3 font-medium">Total · {rows.length} categorias</td>
                    <td className="px-4 py-3 text-right"><Money cents={sum.planned} size="sm" className="font-semibold" /></td>
                    <td className="px-4 py-3 text-right"><Money cents={sum.contracted} size="sm" className="font-semibold" /></td>
                    <td className="px-4 py-3 text-right">
                      <Money cents={sum.planned - sum.contracted} size="sm" signed tone={sum.planned - sum.contracted < 0 ? 'danger' : 'default'} className="font-medium" />
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-[12px] text-ink-muted">
                      a diferença inclui categorias ainda sem contrato
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <ul className="space-y-2.5 md:hidden">
            {rows.map((c) => (
              <li key={c.category.id} className="card px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5"><NeedIcon c={c} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <a href={href.category(c.category.id)} className="text-[15px] font-medium">{c.category.name}</a>
                        <div className="text-[12px] text-ink-muted">{NEED_LABEL[c.category.need]}</div>
                      </div>
                      <button aria-label={`Editar ${c.category.name}`} onClick={() => setEditing(c.category)} className="rounded-md p-1.5 text-ink-faint">
                        <Pencil size={14} />
                      </button>
                    </div>
                    {c.category.need !== 'dismissed' && (
                      <>
                        <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-[0.05em] text-ink-muted">
                          <div>Planejado<div className="mt-0.5 normal-case tracking-normal"><PlannedCell category={c.category} /></div></div>
                          <div>Contratado<div className="mt-1 normal-case tracking-normal">{c.contracted ? <Money cents={c.contracted} size="sm" className="font-medium" /> : '—'}</div></div>
                          <div>Diferença<div className="mt-1 normal-case tracking-normal"><Diff c={c} /></div></div>
                        </div>
                        <div className="mt-2.5"><StateCell c={c} /></div>
                      </>
                    )}
                    <div className="mt-2"><SupplierCell c={c} snapshot={snapshot} /></div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <CategoryForm open={editing !== null} onClose={() => setEditing(null)} snapshot={snapshot} category={editing && editing !== 'new' ? editing : undefined} />
    </div>
  );
}

function headline(commitment: number, pending: number, over: number): string {
  const pct = formatPct(commitment);
  const money = commitment < 0.85 ? `Financeiramente estamos bem (${pct} do teto comprometido)` : commitment <= 1 ? `Atenção ao teto: ${pct} já comprometido` : `O contratado passou do teto (${pct})`;
  const parts: string[] = [];
  if (pending) parts.push(`ainda ${pending === 1 ? 'falta 1 fornecedor necessário' : `faltam ${pending} fornecedores necessários`}`);
  if (over) parts.push(`${over} ${over === 1 ? 'categoria está acima' : 'categorias estão acima'} do planejado`);
  if (!parts.length) return `${money}, e tudo o que é necessário já está contratado.`;
  return `${money}, mas ${parts.join(' e ')}.`;
}

function NeedIcon({ c }: { c: CategoryView }) {
  if (c.category.need === 'dismissed') return <Minus size={16} className="text-ink-faint" aria-label="dispensada" />;
  if (c.hasContract)
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok/15 text-ok" aria-label="contratado">
        <Check size={12} strokeWidth={2.5} />
      </span>
    );
  return <Circle size={18} strokeWidth={1.5} className={c.category.need === 'required' ? 'text-warn' : 'text-ink-faint'} aria-label="ainda não contratado" />;
}

function Diff({ c }: { c: CategoryView }) {
  if (c.difference === null) return c.contracted ? <span className="text-[12px] text-ink-muted">sem orçamento</span> : <span className="text-ink-faint">—</span>;
  if (!c.hasContract) return <span className="text-[12.5px] text-ink-faint">a contratar</span>;
  return <Money cents={c.difference} size="sm" signed tone={c.difference < 0 ? 'danger' : c.difference > 0 ? 'ok' : 'muted'} className="font-medium" />;
}

function StateCell({ c }: { c: CategoryView }) {
  if (c.category.need === 'dismissed') return <span className="text-[12.5px] text-ink-faint">fora do orçamento</span>;
  if (!c.planned && !c.contracted) return <span className="text-[12.5px] text-ink-faint">sem orçamento definido</span>;
  const ratio = c.planned ? c.contracted / c.planned : 1;
  return (
    <div className="space-y-1.5">
      {c.hasContract ? (
        <StatusBadge tone={BUDGET_TONE[c.state]}>
          {BUDGET_LABEL[c.state]}
          {c.planned ? ` · ${formatPct(ratio)}` : ''}
        </StatusBadge>
      ) : (
        <span className="text-[12.5px] text-ink-muted">{formatMoney(c.planned ?? 0)} reservados</span>
      )}
      {c.planned ? (
        <div className="relative h-2 w-full max-w-[180px] rounded-full bg-champagne" aria-hidden>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(1, ratio) * 100}%`, background: BUDGET_BAR[c.state] }} />
        </div>
      ) : null}
    </div>
  );
}

function SupplierCell({ c, snapshot }: { c: CategoryView; snapshot: Snapshot }) {
  const names = c.supplierIds.map((id) => snapshot.suppliers.find((s) => s.id === id)!).filter(Boolean);
  if (names.length)
    return (
      <div className="flex flex-col gap-0.5">
        {names.map((s) => (
          <a key={s.id} href={href.supplier(s.id)} className="truncate text-[13px] text-ink-soft hover:text-ink hover:underline underline-offset-4">
            {s.name}
          </a>
        ))}
      </div>
    );
  const quotes = snapshot.quotes.filter((q) => q.categoryId === c.category.id && q.status === 'open');
  if (!quotes.length)
    return c.category.need === 'dismissed' ? null : (
      <a href={href.category(c.category.id)} className="text-[12.5px] text-ink-faint hover:text-ink">
        sem propostas · adicionar
      </a>
    );
  const fav = quotes.find((q) => q.favorite);
  const min = Math.min(...quotes.map((q) => q.amount));
  const max = Math.max(...quotes.map((q) => q.amount));
  return (
    <div className="text-[12.5px] text-ink-muted">
      <a href={href.category(c.category.id)} className="hover:text-ink hover:underline underline-offset-4">
        {quotes.length} {quotes.length === 1 ? 'proposta' : 'propostas'}
        {quotes.length > 1 ? ` · ${formatMoney(min)} a ${formatMoney(max)}` : ` · ${formatMoney(min)}`}
      </a>
      {fav && (
        <a href={href.supplier(fav.supplierId)} className="mt-0.5 flex items-center gap-1 text-ink-soft hover:text-ink">
          <Heart size={11} className="fill-accent text-accent" aria-label="favorita" /> {snapshot.suppliers.find((s) => s.id === fav.supplierId)?.name}
        </a>
      )}
    </div>
  );
}

/** Planejado editável na própria célula: clique, digite, Enter */
function PlannedCell({ category }: { category: Category }) {
  const { run } = useMutate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<Cents | null>(category.plannedBudget);
  const done = useRef(false);
  const save = async () => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    if (value === category.plannedBudget) return;
    await run(() => categoryRepository.save({ ...category, plannedBudget: value }), `Orçamento de ${category.name}: ${value === null ? 'sem valor' : formatMoney(value)}`);
  };
  if (editing)
    return (
      <div
        className="ml-auto w-[130px]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            done.current = true;
            setValue(category.plannedBudget);
            setEditing(false);
          }
        }}
        onBlur={save}
      >
        <MoneyInput ariaLabel={`Planejado para ${category.name}`} value={value} onChange={setValue} autoFocus className="[&_input]:!py-1 [&_input]:text-right [&_input]:text-[13px]" />
      </div>
    );
  return (
    <button
      onClick={() => {
        setValue(category.plannedBudget);
        done.current = false;
        setEditing(true);
      }}
      title="Clique para editar"
      className="rounded px-1 py-0.5 hover:bg-cream hover:ring-1 hover:ring-sand"
    >
      {category.plannedBudget ? <Money cents={category.plannedBudget} size="sm" /> : <span className="text-[12.5px] text-ink-faint underline decoration-dotted underline-offset-4">definir</span>}
    </button>
  );
}

function Tile({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="card px-5 py-4">
      <div className="label">{label}</div>
      <div className="mt-1.5">{value}</div>
      {note && <div className="mt-0.5 text-[12px] text-ink-muted">{note}</div>}
    </div>
  );
}

function Th({ children, right, className = '' }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <th className={`label px-4 py-2.5 font-medium ${right ? 'text-right' : ''} ${className}`}>{children}</th>;
}


function CatIcon({ c }: { c: CategoryView }) {
  const Icon = categoryIcon(c.category);
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${c.hasContract ? 'btn-grad text-white' : 'bg-cream text-ink-muted'}`}>
      <Icon size={18} strokeWidth={1.8} aria-hidden />
    </span>
  );
}
