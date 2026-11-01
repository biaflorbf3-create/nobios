import { ChevronRight, Heart, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { href, navigate } from '../../app/router';
import { useFinance } from '../../data/hooks/useSnapshot';
import { SUPPLIER_STATUS_LABEL, type SupplierDisplayStatus, type SupplierView } from '../../domain/finance';
import { Button, Select } from '../../ui/form';
import { Money } from '../../ui/Money';
import { StatusBadge } from '../../ui/StatusBadge';
import { SUPPLIER_TONE } from '../../ui/tones';
import { ContractForm } from '../contracts/ContractForm';
import { SupplierForm } from './SupplierForm';
import { categoryIcon } from '../../ui/categoryIcon';

type Filter = 'all' | 'contracted' | 'open' | 'finished' | 'cancelled';
const FILTERS: { id: Filter; label: string; match: (s: SupplierDisplayStatus) => boolean }[] = [
  { id: 'all', label: 'Todos', match: (s) => s !== 'cancelled' },
  { id: 'contracted', label: 'Contratados', match: (s) => s === 'contracted' },
  { id: 'open', label: 'Em negociação', match: (s) => s === 'researching' || s === 'quoted' || s === 'negotiating' },
  { id: 'finished', label: 'Finalizados', match: (s) => s === 'finished' },
  { id: 'cancelled', label: 'Cancelados', match: (s) => s === 'cancelled' },
];

const ORDER: Record<SupplierDisplayStatus, number> = { contracted: 0, finished: 1, negotiating: 2, quoted: 3, researching: 4, cancelled: 5 };

export function SuppliersPage() {
  const data = useFinance();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [contractFor, setContractFor] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const f = FILTERS.find((x) => x.id === filter)!;
    const q = normalize(query);
    return data.finance.suppliers
      .filter((v) => f.match(v.status))
      .filter((v) => !category || v.categoryIds.includes(category))
      .filter((v) => !q || normalize(`${v.supplier.name} ${v.supplier.contactName ?? ''}`).includes(q))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.contracted - a.contracted || a.supplier.name.localeCompare(b.supplier.name));
  }, [data, filter, query, category]);

  if (!data) return null;
  const { snapshot, finance } = data;
  const catName = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, finance.suppliers.filter((v) => f.match(v.status)).length])) as Record<Filter, number>;
  const total = {
    contracted: rows.reduce((s, r) => s + r.contracted, 0),
    paid: rows.reduce((s, r) => s + r.paid, 0),
    remaining: rows.reduce((s, r) => s + r.remaining, 0),
  };
  const usedCategories = snapshot.categories.filter((c) => finance.suppliers.some((v) => v.categoryIds.includes(c.id)));

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="mt-2.5 text-[14px] text-ink-muted">
            <span className="num font-medium text-ink">{finance.contractedSupplierCount}</span> contratados ·{' '}
            <span className="num font-medium text-ink">{counts.open}</span> em negociação ·{' '}
            <span className="num font-medium text-ink">{finance.pendingCategories.length}</span> categorias ainda sem fornecedor
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)} className="self-start sm:self-auto">
          <Plus size={15} strokeWidth={2} aria-hidden /> Fornecedor
        </Button>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Filtrar por status" className="flex overflow-x-auto glass rounded-full p-1 shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
                filter === f.id ? 'bg-accent text-white' : 'text-ink-muted hover:bg-cream hover:text-ink'
              }`}
            >
              {f.label}
              <span className={`num text-[11px] ${filter === f.id ? 'text-white/75' : 'text-ink-faint'}`}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-1 gap-2">
          <label className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar fornecedor ou contato"
              aria-label="Buscar"
              className="w-full glass rounded-full py-2.5 pl-10 pr-4 shadow-card text-[13.5px] placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria" className="!w-auto min-w-[150px] text-[13.5px]">
            <option value="">Todas as categorias</option>
            {usedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="text-[14px] text-ink-muted">Nenhum fornecedor encontrado.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Plus size={14} aria-hidden /> Cadastrar fornecedor
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-sand text-left">
                  <Th>Fornecedor</Th>
                  <Th>Categoria</Th>
                  <Th>Status</Th>
                  <Th right>Contratado</Th>
                  <Th right>Pago</Th>
                  <Th right>Restante</Th>
                  <Th className="w-[140px]">Progresso</Th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr
                    key={v.supplier.id}
                    onClick={() => navigate(href.supplier(v.supplier.id))}
                    className="group cursor-pointer border-b border-sand/70 last:border-0 hover:bg-cream/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SupIcon categoryId={v.supplier.mainCategoryId} name={catName.get(v.supplier.mainCategoryId) ?? ''} active={v.contracted > 0} />
                        <div className="min-w-0">
                          <a href={href.supplier(v.supplier.id)} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:underline underline-offset-4">
                            {v.supplier.name}
                          </a>
                          {v.supplier.contactName && <div className="text-[12.5px] text-ink-muted">{v.supplier.contactName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{v.categoryIds.map((id) => catName.get(id)).join(' · ')}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <StatusBadge tone={SUPPLIER_TONE[v.status]}>{SUPPLIER_STATUS_LABEL[v.status]}</StatusBadge>
                        {v.favorite && <Heart size={13} className="fill-accent text-accent" aria-label="favorito" />}
                      </span>
                    </td>
                    {v.contracted > 0 ? (
                      <>
                        <td className="px-4 py-3 text-right"><Money cents={v.contracted} size="sm" className="font-medium" /></td>
                        <td className="px-4 py-3 text-right"><Money cents={v.paid} size="sm" tone="muted" /></td>
                        <td className="px-4 py-3 text-right"><Money cents={v.remaining} size="sm" /></td>
                        <td className="px-4 py-3"><Progress paid={v.paid} total={v.contracted} /></td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right text-[12.5px] text-ink-muted">
                          {v.quoted !== null ? (
                            <span title="Valor da proposta, ainda não contratado">
                              proposta <Money cents={v.quoted} size="sm" className="text-ink-soft" />
                            </span>
                          ) : (
                            'sem proposta'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-ink-faint">—</td>
                        <td className="px-4 py-3 text-right text-ink-faint">—</td>
                        <td className="px-4 py-3" />
                      </>
                    )}
                    <td className="pr-3 text-ink-faint group-hover:text-ink"><ChevronRight size={16} aria-hidden /></td>
                  </tr>
                ))}
              </tbody>
              {total.contracted > 0 && (
                <tfoot>
                  <tr className="border-t border-sand bg-cream/40 text-[13px]">
                    <td className="px-4 py-3 font-medium" colSpan={3}>
                      Total · {rows.length} {rows.length === 1 ? 'fornecedor' : 'fornecedores'}
                    </td>
                    <td className="px-4 py-3 text-right"><Money cents={total.contracted} size="sm" className="font-semibold" /></td>
                    <td className="px-4 py-3 text-right"><Money cents={total.paid} size="sm" className="font-medium" /></td>
                    <td className="px-4 py-3 text-right"><Money cents={total.remaining} size="sm" className="font-medium" /></td>
                    <td className="px-4 py-3"><Progress paid={total.paid} total={total.contracted} /></td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Celular: cartões */}
          <ul className="space-y-2.5 md:hidden">
            {rows.map((v) => (
              <MobileCard key={v.supplier.id} v={v} categories={v.categoryIds.map((id) => catName.get(id)).join(' · ')} />
            ))}
          </ul>
        </>
      )}

      <SupplierForm
        open={creating}
        onClose={() => setCreating(false)}
        snapshot={snapshot}
        defaultCategoryId={category || undefined}
        onSaved={(id, andContract) => (andContract ? setContractFor(id) : navigate(href.supplier(id)))}
      />
      {contractFor && (
        <ContractForm
          open
          onClose={() => {
            const id = contractFor;
            setContractFor(null);
            navigate(href.supplier(id));
          }}
          snapshot={snapshot}
          supplierId={contractFor}
        />
      )}
    </div>
  );
}

function MobileCard({ v, categories }: { v: SupplierView; categories: string }) {
  return (
    <li>
      <a href={href.supplier(v.supplier.id)} className="card block px-4 py-3.5 active:bg-cream/50">
        <div className="flex items-start justify-between gap-3">
          <SupIcon categoryId={v.supplier.mainCategoryId} name={categories} active={v.contracted > 0} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{v.supplier.name}</div>
            <div className="truncate text-[12.5px] text-ink-muted">{categories}</div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {v.favorite && <Heart size={13} className="fill-accent text-accent" aria-label="favorito" />}
            <StatusBadge tone={SUPPLIER_TONE[v.status]}>{SUPPLIER_STATUS_LABEL[v.status]}</StatusBadge>
          </span>
        </div>
        {v.contracted > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-[0.05em] text-ink-muted">
              <div>Contratado<div className="mt-0.5 normal-case tracking-normal"><Money cents={v.contracted} size="sm" className="font-medium" /></div></div>
              <div>Pago<div className="mt-0.5 normal-case tracking-normal"><Money cents={v.paid} size="sm" /></div></div>
              <div>Restante<div className="mt-0.5 normal-case tracking-normal"><Money cents={v.remaining} size="sm" /></div></div>
            </div>
            <div className="mt-2.5"><Progress paid={v.paid} total={v.contracted} /></div>
          </>
        ) : (
          <div className="mt-2 text-[12.5px] text-ink-muted">
            {v.quoted !== null ? <>Proposta <Money cents={v.quoted} size="sm" className="text-ink-soft" /></> : 'Sem proposta ainda'}
          </div>
        )}
      </a>
    </li>
  );
}

export function Progress({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(1, paid / total) : 0;
  return (
    <div className="flex items-center gap-2" title={`${Math.round(pct * 100)}% pago`}>
      <div className="h-1.5 flex-1 rounded-full bg-champagne">
        <div className={`h-1.5 rounded-full ${pct >= 1 ? 'bg-ok' : 'btn-grad'}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="num w-9 text-right text-[11.5px] text-ink-muted">{Math.round(pct * 100)}%</span>
    </div>
  );
}

function Th({ children, right, className = '' }: { children?: React.ReactNode; right?: boolean; className?: string }) {
  return <th className={`px-4 py-2.5 label font-medium ${right ? 'text-right' : ''} ${className}`}>{children}</th>;
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function SupIcon({ categoryId, name, active }: { categoryId: string; name: string; active: boolean }) {
  const Icon = categoryIcon({ id: categoryId, name });
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${active ? 'bg-accent-soft text-accent' : 'bg-cream text-ink-muted'}`}>
      <Icon size={18} strokeWidth={1.8} aria-hidden />
    </span>
  );
}
