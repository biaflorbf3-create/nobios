import { ArrowLeft, AtSign, Ban, CheckCircle2, ExternalLink, FileText, Globe, Heart, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Plus, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { navigate } from '../../app/router';
import { useMutate } from '../../data/hooks/useMutate';
import { useFinance } from '../../data/hooks/useSnapshot';
import { contractRepository, supplierRepository } from '../../data/repositories';
import { SUPPLIER_STATUS_LABEL, type ContractView } from '../../domain/finance';
import type { Snapshot, Supplier } from '../../domain/types';
import { formatShort } from '../../lib/dates';
import { formatMoney, formatPct } from '../../lib/money';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button } from '../../ui/form';
import { PAYMENT_METHOD_LABEL } from '../../ui/labels';
import { Money } from '../../ui/Money';
import { StatusBadge } from '../../ui/StatusBadge';
import { SUPPLIER_TONE } from '../../ui/tones';
import { ContractForm } from '../contracts/ContractForm';
import { categoryIcon } from '../../ui/categoryIcon';
import { InstallmentTable } from '../contracts/InstallmentTable';
import { ScheduleSheet } from '../contracts/ScheduleSheet';
import { SupplierForm } from './SupplierForm';

export function SupplierDetailPage({ id }: { id: string }) {
  const data = useFinance();
  const { run } = useMutate();
  const [editing, setEditing] = useState(false);
  const [newContract, setNewContract] = useState(false);
  const [confirm, setConfirm] = useState<null | 'delete' | 'cancel'>(null);

  if (!data) return null;
  const { snapshot, finance } = data;
  const view = finance.suppliers.find((v) => v.supplier.id === id);
  if (!view) {
    return (
      <div className="pt-10">
        <p className="text-ink-muted">Fornecedor não encontrado.</p>
        <a href="#fornecedores" className="mt-4 inline-block font-medium">← Fornecedores</a>
      </div>
    );
  }
  const s = view.supplier;
  const catName = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  const contracts = view.contracts.map((c) => finance.contracts.get(c.id)!).sort((a, b) => a.contract.contractDate.localeCompare(b.contract.contractDate));
  const quotes = snapshot.quotes.filter((q) => q.supplierId === id);
  const hasContracts = contracts.length > 0;
  const pctPaid = view.contracted ? view.paid / view.contracted : 0;

  return (
    <div className="space-y-5">
      <a href="#fornecedores" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Fornecedores
      </a>

      {/* Informações principais */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <CatTile categoryId={s.mainCategoryId} snapshot={snapshot} />
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title">{s.name}</h1>
            <StatusBadge tone={SUPPLIER_TONE[view.status]}>{SUPPLIER_STATUS_LABEL[view.status]}</StatusBadge>
            {view.favorite && <Heart size={15} className="fill-accent text-accent" aria-label="favorito" />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-ink-soft">
            <span>{view.categoryIds.map((c) => catName.get(c)).join(' · ')}</span>
            {s.contactName && <span className="text-ink-muted">·</span>}
            {s.contactName && <span>{s.contactName}</span>}
            <ContactLinks s={s} />
          </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={() => setEditing(true)}><Pencil size={14} aria-hidden /> Editar</Button>
          {view.status !== 'cancelled' && (
            <Button variant="primary" onClick={() => setNewContract(true)}>
              <Plus size={15} strokeWidth={2} aria-hidden /> {hasContracts ? 'Aditivo / contrato' : 'Cadastrar contrato'}
            </Button>
          )}
          <SupplierMenu
            supplier={s}
            hasContracts={hasContracts}
            onDelete={() => setConfirm('delete')}
            onCancel={() => setConfirm('cancel')}
            onToggleDelivered={() => run(() => supplierRepository.save({ ...s, delivered: !s.delivered }), s.delivered ? 'Marcado como em andamento' : 'Marcado como finalizado')}
            onReactivate={() => run(() => supplierRepository.save({ ...s, pipelineStatus: 'negotiating' }), 'Fornecedor reativado')}
          />
        </div>
      </header>

      {/* Financeiro */}
      <section aria-label="Financeiro" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Proposta" value={view.quoted !== null ? <Money cents={view.quoted} size="lg" tone="muted" /> : <span className="text-[20px] text-ink-faint">—</span>} />
        <Tile label="Contratado" value={<Money cents={view.contracted} size="lg" />} />
        <Tile label="Pago" value={<Money cents={view.paid} size="lg" />} note={view.contracted ? `${formatPct(pctPaid)} do contratado` : undefined} />
        <Tile label="Restante" value={<Money cents={view.remaining} size="lg" tone={view.remaining === 0 && view.contracted > 0 ? 'ok' : 'default'} />} note={view.remaining === 0 && view.contracted > 0 ? 'Quitado ✓' : undefined} />
      </section>
      {view.contracted > 0 && (
        <div className="-mt-1 h-2 overflow-hidden rounded-full bg-champagne" role="img" aria-label={`${formatPct(pctPaid)} pago`}>
          <div className={`btn-grad h-full rounded-full`} style={{ width: `${Math.min(1, pctPaid) * 100}%` }} />
        </div>
      )}

      {/* Contratos e parcelas */}
      {contracts.map((cv) => (
        <ContractCard key={cv.contract.id} cv={cv} snapshot={snapshot} supplier={s} categoryName={catName.get(cv.contract.categoryId) ?? ''} multiple={contracts.length > 1} />
      ))}

      {!hasContracts && (
        <section className="card px-6 py-10 text-center">
          <FileText size={22} className="mx-auto text-ink-faint" aria-hidden />
          <p className="mt-3 text-[14.5px] font-medium">Ainda sem contrato</p>
          <p className="mx-auto mt-1 max-w-[380px] text-[13px] text-ink-muted">
            {quotes.length
              ? `Proposta de ${formatMoney(quotes[0].amount)}${quotes[0].paymentTerms ? ` · ${quotes[0].paymentTerms}` : ''}. Ao fechar, cadastre o contrato e as parcelas entram no fluxo.`
              : 'Quando fecharem, cadastre o contrato: o valor passa a contar como comprometido e as parcelas entram no fluxo.'}
          </p>
          {view.status !== 'cancelled' && (
            <Button variant="primary" className="mt-5" onClick={() => setNewContract(true)}>
              <Plus size={15} aria-hidden /> Cadastrar contrato
            </Button>
          )}
        </section>
      )}

      {/* Notas + documentos */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <NotesCard supplier={s} />
        <section className="card">
          <h2 className="label px-5 pt-4 pb-3">Documentos e links</h2>
          <ul className="px-5 pb-4 text-[13.5px]">
            {contracts.flatMap((cv) => [
              ...(cv.contract.documentUrl ? [{ label: `Contrato · ${cv.contract.title}`, url: cv.contract.documentUrl }] : []),
              ...(cv.contract.links ?? []),
            ]).concat(quotes.filter((q) => q.url).map((q) => ({ label: `Proposta · ${formatMoney(q.amount)}`, url: q.url! })))
              .map((l, i) => (
                <li key={i} className="border-b border-sand/70 py-2 last:border-0">
                  <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-accent">
                    <FileText size={14} className="text-ink-muted" aria-hidden /> {l.label} <ExternalLink size={12} className="text-ink-faint" aria-hidden />
                  </a>
                </li>
              ))}
            {!contracts.some((cv) => cv.contract.documentUrl || cv.contract.links?.length) && !quotes.some((q) => q.url) && (
              <li className="text-[13px] text-ink-muted">Nenhum documento. Adicione o link do contrato em “Editar contrato”.</li>
            )}
          </ul>
        </section>
      </div>

      <SupplierForm open={editing} onClose={() => setEditing(false)} snapshot={snapshot} supplier={s} />
      {newContract && <ContractForm open onClose={() => setNewContract(false)} snapshot={snapshot} supplierId={s.id} />}

      <ConfirmDialog
        open={confirm === 'delete'}
        title={`Excluir ${s.name}?`}
        confirmLabel="Excluir"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          if (await run(() => supplierRepository.removeSafe(s.id), 'Fornecedor excluído')) navigate('#fornecedores');
        }}
      >
        O fornecedor e suas propostas serão removidos. Não dá para desfazer.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'cancel'}
        title={`Marcar ${s.name} como cancelado?`}
        confirmLabel="Marcar como cancelado"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await run(() => supplierRepository.save({ ...s, pipelineStatus: 'cancelled' }), 'Fornecedor cancelado');
        }}
      >
        Ele sai da lista principal, mas o histórico fica guardado. Se houver contrato ativo, cancele o contrato também.
      </ConfirmDialog>
    </div>
  );
}

function ContractCard({ cv, snapshot, supplier, categoryName, multiple }: { cv: ContractView; snapshot: Snapshot; supplier: Supplier; categoryName: string; multiple: boolean }) {
  const { run } = useMutate();
  const [edit, setEdit] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const c = cv.contract;
  const cancelled = c.status === 'cancelled';
  return (
    <section className={`card overflow-hidden ${cancelled ? 'opacity-70' : ''}`}>
      <header className="flex flex-col gap-3 px-5 pt-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="label">{multiple ? 'Contrato' : 'Contrato e parcelas'}</h2>
            {cancelled && <StatusBadge tone="neutral" icon={Ban}>Cancelado</StatusBadge>}
          </div>
          <div className="mt-1.5 text-[16px] font-medium">{c.title}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-muted">
            <span>{categoryName}</span>
            <span>Contratado em {formatShort(c.contractDate)}</span>
            {c.paymentMethodDefault && <span>{PAYMENT_METHOD_LABEL[c.paymentMethodDefault]}</span>}
            {c.paymentTerms && <span>{c.paymentTerms}</span>}
            {c.documentUrl && (
              <a href={c.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-soft hover:text-accent">
                contrato <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-4">
          <div className="text-right">
            <Money cents={c.totalValue} size="lg" />
            <div className="text-[12px] text-ink-muted">
              pago {formatMoney(cv.paid)} · restam {formatMoney(cv.remaining)}
            </div>
          </div>
          {!cancelled && (
            <Menu
              items={[
                { label: 'Editar contrato', icon: Pencil, onClick: () => setEdit(true) },
                { label: cv.installments.length ? 'Refazer cronograma' : 'Gerar cronograma', icon: FileText, onClick: () => setSchedule(true) },
                { label: 'Cancelar contrato', icon: Ban, onClick: () => setConfirmCancel(true), danger: true },
              ]}
            />
          )}
          {cancelled && (
            <Button size="sm" variant="ghost" onClick={() => run(() => contractRepository.save({ ...c, status: 'active' }), 'Contrato reativado')}>
              <Undo2 size={13} aria-hidden /> Reativar
            </Button>
          )}
        </div>
      </header>

      {cv.installments.length === 0 && !cancelled ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand bg-warn/5 px-5 py-4">
          <p className="text-[13px] text-ink-soft">
            Sem parcelas: os {formatMoney(cv.unscheduled)} aparecem como “sem data” no fluxo.
          </p>
          <Button variant="primary" size="sm" onClick={() => setSchedule(true)}>Gerar cronograma</Button>
        </div>
      ) : (
        <InstallmentTable view={cv} snapshot={snapshot} />
      )}

      {edit && <ContractForm open onClose={() => setEdit(false)} snapshot={snapshot} supplierId={supplier.id} contract={c} />}
      {schedule && <ScheduleSheet open onClose={() => setSchedule(false)} view={cv} supplierName={supplier.name} />}
      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar este contrato?"
        confirmLabel="Cancelar contrato"
        danger
        onClose={() => setConfirmCancel(false)}
        onConfirm={async () => {
          setConfirmCancel(false);
          await run(() => contractRepository.save({ ...c, status: 'cancelled' }), 'Contrato cancelado');
        }}
      >
        {formatMoney(c.totalValue)} saem do total contratado e as parcelas em aberto saem do “a pagar”. Os {formatMoney(cv.paid)} já pagos continuam contando como pagos.
      </ConfirmDialog>
    </section>
  );
}

function NotesCard({ supplier }: { supplier: Supplier }) {
  const { run } = useMutate();
  const [text, setText] = useState(supplier.notes ?? '');
  useEffect(() => setText(supplier.notes ?? ''), [supplier.notes]);
  const dirty = text !== (supplier.notes ?? '');
  return (
    <section className="card">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="label">Notas</h2>
        {dirty && <span className="text-[11.5px] text-ink-faint">salva ao sair do campo</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => dirty && run(() => supplierRepository.save({ ...supplier, notes: text.trim() || undefined }), 'Notas salvas')}
        placeholder="Degustação, prazos, combinados, o que não esquecer…"
        rows={5}
        aria-label="Notas"
        className="block w-full resize-y bg-transparent px-5 pb-4 text-[14px] leading-6 text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </section>
  );
}

function ContactLinks({ s }: { s: Supplier }) {
  const digits = (v: string) => v.replace(/\D/g, '');
  const links: { icon: typeof Phone; label: string; url?: string }[] = [];
  if (s.whatsapp) links.push({ icon: MessageCircle, label: s.whatsapp, url: `https://wa.me/55${digits(s.whatsapp)}` });
  if (s.phone) links.push({ icon: Phone, label: s.phone });
  if (s.email) links.push({ icon: Mail, label: s.email });
  if (s.instagram) links.push({ icon: AtSign, label: s.instagram.replace(/^@/, ''), url: `https://instagram.com/${s.instagram.replace(/^@/, '')}` });
  if (s.website) links.push({ icon: Globe, label: s.website.replace(/^https?:\/\//, ''), url: s.website });
  return (
    <>
      {links.map(({ icon: Icon, label, url }) =>
        url ? (
          <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent">
            <Icon size={13} className="text-ink-muted" aria-hidden /> {label}
          </a>
        ) : (
          <span key={label} className="inline-flex items-center gap-1.5 select-all">
            <Icon size={13} className="text-ink-muted" aria-hidden /> {label}
          </span>
        ),
      )}
    </>
  );
}

function Tile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="card px-5 py-4">
      <div className="label">{label}</div>
      <div className="mt-1.5">{value}</div>
      {note && <div className="mt-0.5 text-[12px] text-ink-muted">{note}</div>}
    </div>
  );
}

interface MenuItem {
  label: string;
  icon: typeof Pencil;
  onClick: () => void;
  danger?: boolean;
}

function Menu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button aria-label="Mais ações" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="rounded-lg border border-sand p-2 text-ink-muted hover:border-ink-faint hover:text-ink">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-56 rounded-xl border border-sand bg-surface p-1.5 shadow-hover">
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-cream ${danger ? 'text-danger' : ''}`}
            >
              <Icon size={15} strokeWidth={1.5} aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierMenu({
  supplier,
  hasContracts,
  onDelete,
  onCancel,
  onToggleDelivered,
  onReactivate,
}: {
  supplier: Supplier;
  hasContracts: boolean;
  onDelete: () => void;
  onCancel: () => void;
  onToggleDelivered: () => void;
  onReactivate: () => void;
}) {
  const items: MenuItem[] = [];
  if (supplier.pipelineStatus === 'cancelled') items.push({ label: 'Reativar fornecedor', icon: Undo2, onClick: onReactivate });
  else {
    if (hasContracts) items.push({ label: supplier.delivered ? 'Desmarcar finalizado' : 'Marcar como finalizado', icon: CheckCircle2, onClick: onToggleDelivered });
    items.push({ label: 'Marcar como cancelado', icon: Ban, onClick: onCancel });
  }
  if (!hasContracts) items.push({ label: 'Excluir fornecedor', icon: Trash2, onClick: onDelete, danger: true });
  return <Menu items={items} />;
}

function CatTile({ categoryId, snapshot }: { categoryId: string; snapshot: Snapshot }) {
  const cat = snapshot.categories.find((c) => c.id === categoryId);
  const Icon = categoryIcon(cat ?? { id: categoryId, name: '' });
  return (
    <span className="btn-grad mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-white shadow-glow">
      <Icon size={24} strokeWidth={1.8} aria-hidden />
    </span>
  );
}
