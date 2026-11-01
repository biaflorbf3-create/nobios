import { ArrowLeft, Check, ExternalLink, Heart, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { href } from '../../app/router';
import { useMutate } from '../../data/hooks/useMutate';
import { useFinance } from '../../data/hooks/useSnapshot';
import { quoteRepository } from '../../data/repositories';
import type { CategoryView } from '../../domain/finance';
import type { Quote, Snapshot } from '../../domain/types';
import { formatShort } from '../../lib/dates';
import { formatMoney, formatPct } from '../../lib/money';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button } from '../../ui/form';
import { Money } from '../../ui/Money';
import { StatusBadge } from '../../ui/StatusBadge';
import { BUDGET_BAR, BUDGET_LABEL, BUDGET_TONE } from '../../ui/tones';
import { ContractForm } from '../contracts/ContractForm';
import { Progress } from '../suppliers/SuppliersPage';
import { CategoryForm, NEED_LABEL } from './CategoryForm';
import { QuoteForm } from './QuoteForm';
import { categoryIcon } from '../../ui/categoryIcon';

/** Categoria: o que já está contratado e as propostas comparadas lado a lado */
export function CategoryDetailPage({ id }: { id: string }) {
  const data = useFinance();
  const { run } = useMutate();
  const [quoteForm, setQuoteForm] = useState<Quote | 'new' | null>(null);
  const [contracting, setContracting] = useState<Quote | null>(null);
  const [editCat, setEditCat] = useState(false);
  const [removeQuote, setRemoveQuote] = useState<Quote | null>(null);
  const [showDeclined, setShowDeclined] = useState(false);

  if (!data) return null;
  const { snapshot, finance } = data;
  const view = finance.categories.find((c) => c.category.id === id);
  if (!view) {
    return (
      <div className="pt-10">
        <p className="text-ink-muted">Categoria não encontrada.</p>
        <a href="#orcamento" className="mt-4 inline-block font-medium">← Orçamento</a>
      </div>
    );
  }
  const c = view.category;
  const quotes = snapshot.quotes.filter((q) => q.categoryId === id);
  const open = quotes.filter((q) => q.status === 'open').sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.amount - b.amount);
  const decided = quotes.filter((q) => q.status !== 'open');
  const contracts = snapshot.contracts.filter((k) => k.categoryId === id && k.status === 'active');
  const cheapest = open.length > 1 ? Math.min(...open.map((q) => q.amount)) : null;
  const remainingBudget = view.planned !== null ? view.planned - view.contracted : null;

  return (
    <div className="space-y-5">
      <a href="#orcamento" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Orçamento
      </a>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <CatHeaderIcon id={c.id} name={c.name} />
          <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title">{c.name}</h1>
            <StatusBadge tone={c.need === 'required' ? (view.hasContract ? 'ok' : 'warn') : 'neutral'} icon={view.hasContract ? Check : undefined}>
              {view.hasContract ? 'Contratado' : NEED_LABEL[c.need]}
            </StatusBadge>
          </div>
          <BudgetLine view={view} />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={() => setEditCat(true)}>
            <Pencil size={14} aria-hidden /> Categoria
          </Button>
          <Button variant="primary" onClick={() => setQuoteForm('new')}>
            <Plus size={15} strokeWidth={2} aria-hidden /> Proposta
          </Button>
        </div>
      </header>

      {/* contratados */}
      {contracts.length > 0 && (
        <section className="card">
          <h2 className="label px-5 pt-4 pb-2">Contratado</h2>
          <ul className="divide-y divide-sand/70">
            {contracts.map((k) => {
              const cv = finance.contracts.get(k.id)!;
              const sup = snapshot.suppliers.find((s) => s.id === k.supplierId);
              return (
                <li key={k.id}>
                  <a href={href.supplier(k.supplierId)} className="grid grid-cols-1 items-center gap-2 px-5 py-3 hover:bg-cream/40 sm:grid-cols-[1fr_auto_160px]">
                    <div>
                      <div className="font-medium">{sup?.name}</div>
                      <div className="text-[12.5px] text-ink-muted">
                        {k.title} · contratado em {formatShort(k.contractDate)}
                      </div>
                    </div>
                    <Money cents={k.totalValue} size="md" />
                    <Progress paid={cv.paid} total={k.totalValue} />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* propostas */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="label">
            {open.length ? `Propostas em aberto · ${open.length}` : 'Propostas'}
          </h2>
          {remainingBudget !== null && open.length > 0 && (
            <span className="text-[12.5px] text-ink-muted">
              {view.hasContract ? 'Saldo do planejado' : 'Planejado'}: <Money cents={remainingBudget} size="sm" className="font-medium text-ink" />
            </span>
          )}
        </div>
        {open.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <p className="text-[14px] text-ink-muted">
              {view.hasContract ? 'Nenhuma proposta em aberto: esta categoria já está contratada.' : 'Nenhuma proposta ainda. Cadastre as que receberem para comparar aqui.'}
            </p>
            <Button className="mt-4" onClick={() => setQuoteForm('new')}>
              <Plus size={14} aria-hidden /> Cadastrar proposta
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {open.map((q) => (
              <QuoteCard
                key={q.id}
                q={q}
                snapshot={snapshot}
                budget={remainingBudget}
                cheapest={cheapest !== null && q.amount === cheapest}
                onFavorite={() => run(() => quoteRepository.save({ ...q, favorite: !q.favorite }), q.favorite ? 'Favorito removido' : 'Marcada como favorita ♥')}
                onEdit={() => setQuoteForm(q)}
                onContract={() => setContracting(q)}
                onDecline={() => run(() => quoteRepository.save({ ...q, status: 'declined', favorite: false }), 'Proposta descartada')}
              />
            ))}
          </div>
        )}
      </section>

      {/* descartadas / aceitas */}
      {decided.length > 0 && (
        <section>
          <button onClick={() => setShowDeclined((x) => !x)} className="text-[13px] font-medium text-ink-muted hover:text-ink">
            {showDeclined ? 'Ocultar' : 'Ver'} {decided.length} {decided.length === 1 ? 'proposta decidida' : 'propostas decididas'}
          </button>
          {showDeclined && (
            <ul className="card mt-3 divide-y divide-sand/70">
              {decided.map((q) => {
                const sup = snapshot.suppliers.find((s) => s.id === q.supplierId);
                return (
                  <li key={q.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13.5px]">
                    <span className="min-w-0 flex-1">
                      <a href={href.supplier(q.supplierId)} className="font-medium hover:underline underline-offset-4">{sup?.name}</a>
                      {q.paymentTerms && <span className="text-ink-muted"> · {q.paymentTerms}</span>}
                    </span>
                    <Money cents={q.amount} size="sm" tone="muted" />
                    {q.status === 'accepted' ? (
                      <StatusBadge tone="ok">Contratada</StatusBadge>
                    ) : (
                      <>
                        <StatusBadge tone="neutral">Descartada</StatusBadge>
                        <button
                          onClick={() => run(() => quoteRepository.save({ ...q, status: 'open' }), 'Proposta reaberta')}
                          className="flex items-center gap-1 text-[12.5px] text-ink-muted hover:text-ink"
                        >
                          <RotateCcw size={12} aria-hidden /> reabrir
                        </button>
                        <button onClick={() => setRemoveQuote(q)} aria-label="Excluir proposta" className="rounded p-1 text-ink-faint hover:text-danger">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <QuoteForm open={quoteForm !== null} onClose={() => setQuoteForm(null)} snapshot={snapshot} categoryId={id} quote={quoteForm && quoteForm !== 'new' ? quoteForm : undefined} />
      {contracting && <ContractForm open onClose={() => setContracting(null)} snapshot={snapshot} supplierId={contracting.supplierId} quoteId={contracting.id} />}
      <CategoryForm open={editCat} onClose={() => setEditCat(false)} snapshot={snapshot} category={c} />
      <ConfirmDialog
        open={!!removeQuote}
        title="Excluir proposta?"
        confirmLabel="Excluir"
        danger
        onClose={() => setRemoveQuote(null)}
        onConfirm={async () => {
          const q = removeQuote!;
          setRemoveQuote(null);
          await run(() => quoteRepository.remove(q.id), 'Proposta excluída');
        }}
      >
        Ela some do histórico da categoria.
      </ConfirmDialog>
    </div>
  );
}

function BudgetLine({ view }: { view: CategoryView }) {
  if (view.category.need === 'dismissed') return <p className="mt-2 text-[14px] text-ink-muted">Dispensada: fora do orçamento.</p>;
  if (view.planned === null) return <p className="mt-2 text-[14px] text-ink-muted">Sem orçamento definido.</p>;
  const ratio = view.contracted / view.planned;
  return (
    <div className="mt-2 max-w-[460px]">
      <p className="text-[14px] text-ink-soft">
        Planejado <Money cents={view.planned} size="sm" className="font-medium text-ink" />
        {view.hasContract && (
          <>
            {' '}· contratado <Money cents={view.contracted} size="sm" className="font-medium text-ink" /> ({formatPct(ratio)})
          </>
        )}
      </p>
      {view.hasContract && (
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-champagne">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(1, ratio) * 100}%`, background: BUDGET_BAR[view.state] }} />
          </div>
          <StatusBadge tone={BUDGET_TONE[view.state]}>{BUDGET_LABEL[view.state]}</StatusBadge>
        </div>
      )}
    </div>
  );
}

function QuoteCard({
  q,
  snapshot,
  budget,
  cheapest,
  onFavorite,
  onEdit,
  onContract,
  onDecline,
}: {
  q: Quote;
  snapshot: Snapshot;
  budget: number | null;
  cheapest: boolean;
  onFavorite: () => void;
  onEdit: () => void;
  onContract: () => void;
  onDecline: () => void;
}) {
  const sup = snapshot.suppliers.find((s) => s.id === q.supplierId);
  const diff = budget !== null ? budget - q.amount : null;
  return (
    <article className={`card flex flex-col ${q.favorite ? 'border-accent/60 ring-1 ring-accent/30' : ''}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <a href={href.supplier(q.supplierId)} className="block truncate text-[15.5px] font-medium hover:underline underline-offset-4">
            {sup?.name}
          </a>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {cheapest && <StatusBadge tone="info" icon={false}>Menor valor</StatusBadge>}
            {q.receivedAt && <span className="text-[12px] text-ink-muted">recebida {formatShort(q.receivedAt)}</span>}
          </div>
        </div>
        <button
          onClick={onFavorite}
          aria-pressed={q.favorite}
          aria-label={q.favorite ? 'Remover dos favoritos' : 'Marcar como favorita'}
          title={q.favorite ? 'Favorita' : 'Marcar como favorita'}
          className={`rounded-full p-2 transition-colors ${q.favorite ? 'text-accent' : 'text-ink-faint hover:bg-cream hover:text-accent'}`}
        >
          <Heart size={18} className={q.favorite ? 'fill-accent' : ''} />
        </button>
      </header>

      <div className="px-5 pt-3">
        <Money cents={q.amount} size="xl" />
        {diff !== null && (
          <div className={`mt-0.5 text-[12.5px] ${diff < 0 ? 'text-danger' : 'text-ok'}`}>
            {diff < 0 ? `${formatMoney(-diff)} acima do planejado` : diff === 0 ? 'exatamente o planejado' : `${formatMoney(diff)} abaixo do planejado`}
          </div>
        )}
      </div>

      <dl className="flex-1 space-y-2 px-5 py-4 text-[13px]">
        {q.paymentTerms && <Row label="Condições">{q.paymentTerms}</Row>}
        {q.details && <Row label="Inclui">{q.details}</Row>}
        {q.notes && <Row label="Notas">{q.notes}</Row>}
        {q.url && (
          <Row label="Proposta">
            <a href={q.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
              abrir <ExternalLink size={11} aria-hidden />
            </a>
          </Row>
        )}
        {!q.paymentTerms && !q.details && !q.notes && !q.url && <p className="text-ink-faint">Sem detalhes. Edite para comparar condições.</p>}
      </dl>

      <footer className="flex items-center gap-1.5 border-t border-sand px-5 py-3">
        <Button variant="primary" size="sm" onClick={onContract}>
          Contratar este fornecedor
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Editar proposta">
          <Pencil size={13} aria-hidden />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDecline} className="ml-auto text-ink-muted" title="Descartar proposta" aria-label="Descartar proposta">
          <X size={14} aria-hidden />
        </Button>
      </footer>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink-soft">{children}</dd>
    </div>
  );
}

function CatHeaderIcon({ id, name }: { id: string; name: string }) {
  const Icon = categoryIcon({ id, name });
  return (
    <span className="btn-grad mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-white shadow-glow">
      <Icon size={24} strokeWidth={1.8} aria-hidden />
    </span>
  );
}
