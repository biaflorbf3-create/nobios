import { AlertTriangle, Check, CheckCircle2, HandCoins, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { contractRepository, installmentRepository, paymentRepository } from '../../data/repositories';
import type { Payment } from '../../domain/types';
import { installmentStatusText, type ContractView, type InstallmentView } from '../../domain/finance';
import type { Cents, Installment, Snapshot } from '../../domain/types';
import { addMonths, formatShort, todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { formatMoney } from '../../lib/money';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button, DateInput, MoneyInput, TextInput } from '../../ui/form';
import { PAYMENT_METHOD_LABEL } from '../../ui/labels';
import { Money } from '../../ui/Money';
import { StatusBadge } from '../../ui/StatusBadge';
import { INSTALLMENT_TONE } from '../../ui/tones';
import { useToast } from '../../ui/Toast';
import { useRegisterPayment } from '../payments/PaymentContext';

interface Draft {
  label: string;
  dueDate: string;
  amount: Cents | null;
}

/** Parcelas do contrato: edição na própria linha, adicionar, excluir e conferência do total */
export function InstallmentTable({ view, snapshot }: { view: ContractView; snapshot: Snapshot }) {
  const { run, pending } = useMutate();
  const toast = useToast();
  const register = useRegisterPayment();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ label: '', dueDate: '', amount: null });
  const [confirmDelete, setConfirmDelete] = useState<InstallmentView | null>(null);
  const [reverse, setReverse] = useState<Payment | null>(null);
  const people = new Map(snapshot.people.map((p) => [p.id, p.name]));
  const active = view.contract.status === 'active';
  const items = view.installments;
  const diff = view.contract.totalValue - view.scheduled;

  function startEdit(v: InstallmentView) {
    setEditing(v.installment.id);
    setDraft({ label: v.installment.label, dueDate: v.installment.dueDate, amount: v.installment.amount });
  }

  function startNew() {
    const last = items[items.length - 1]?.installment;
    setEditing('new');
    setDraft({
      label: `Parcela ${items.length + 1}`,
      dueDate: last ? addMonths(last.dueDate, 1) : todayISO(),
      amount: diff > 0 ? diff : null,
    });
  }

  async function saveEdit() {
    if (!draft.amount || draft.amount <= 0 || !draft.dueDate) {
      toast('Informe valor e vencimento.');
      return;
    }
    const now = new Date().toISOString();
    const record: Installment =
      editing === 'new'
        ? {
            id: newId('installments'),
            contractId: view.contract.id,
            label: draft.label.trim() || `Parcela ${items.length + 1}`,
            sequence: (items[items.length - 1]?.installment.sequence ?? 0) + 1,
            amount: draft.amount,
            dueDate: draft.dueDate,
            createdAt: now,
            updatedAt: now,
          }
        : { ...items.find((v) => v.installment.id === editing)!.installment, label: draft.label.trim(), amount: draft.amount, dueDate: draft.dueDate };
    const ok = await run(() => installmentRepository.save(record), editing === 'new' ? 'Parcela adicionada' : 'Parcela atualizada');
    if (ok) setEditing(null);
  }

  return (
    <div>
      {/* Desktop */}
      <table className="hidden w-full text-[13.5px] md:table">
        <thead>
          <tr className="border-y border-sand bg-cream/40 text-left">
            <th className="label px-5 py-2 font-medium">Parcela</th>
            <th className="label px-3 py-2 font-medium">Vencimento</th>
            <th className="label px-3 py-2 text-right font-medium">Valor</th>
            <th className="label px-3 py-2 font-medium">Situação</th>
            <th className="w-[150px]" />
          </tr>
        </thead>
        <tbody>
          {items.map((v) =>
            editing === v.installment.id ? (
              <EditRow key={v.installment.id} draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={() => setEditing(null)} pending={pending} paidNote={v.paid > 0 ? `Já pago: ${formatMoney(v.paid)}` : undefined} />
            ) : (
              <tr key={v.installment.id} className="group border-b border-sand/70 last:border-0">
                <td className="px-5 py-3 font-medium">{v.installment.label}</td>
                <td className="num px-3 py-3 text-ink-soft">{formatShort(v.installment.dueDate)}</td>
                <td className="px-3 py-3 text-right">
                  <Money cents={v.installment.amount} size="sm" className={v.status === 'paid' ? 'text-ink-muted' : 'font-medium'} />
                  {v.isPartial && <div className="text-[11.5px] text-warn">restam {formatMoney(v.remaining)}</div>}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge tone={active ? INSTALLMENT_TONE[v.status] : 'neutral'}>{active ? installmentStatusText(v) : 'Cancelado'}</StatusBadge>
                  {v.payments.length > 0 && <PaidLine v={v} people={people} onReverse={active ? setReverse : undefined} />}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {active && v.remaining > 0 && (
                      <Button size="sm" onClick={() => register(v.installment.id)}>
                        Registrar
                      </Button>
                    )}
                    {active && (
                      <>
                        <IconBtn label={`Editar ${v.installment.label}`} onClick={() => startEdit(v)}><Pencil size={14} /></IconBtn>
                        {v.payments.length === 0 ? (
                          <IconBtn label={`Excluir ${v.installment.label}`} onClick={() => setConfirmDelete(v)} danger><Trash2 size={14} /></IconBtn>
                        ) : (
                          <span className="w-[26px]" aria-hidden />
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ),
          )}
          {editing === 'new' && <EditRow draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={() => setEditing(null)} pending={pending} />}
        </tbody>
      </table>

      {/* Celular */}
      <ul className="divide-y divide-sand/70 border-t border-sand md:hidden">
        {items.map((v) =>
          editing === v.installment.id ? (
            <li key={v.installment.id} className="p-4"><MobileEdit draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={() => setEditing(null)} pending={pending} /></li>
          ) : (
            <li key={v.installment.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{v.installment.label}</div>
                <div className="num text-[12.5px] text-ink-muted">{formatShort(v.installment.dueDate)}</div>
                {v.payments.length > 0 && <PaidLine v={v} people={people} onReverse={active ? setReverse : undefined} />}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Money cents={v.installment.amount} size="sm" className="font-medium" />
                <StatusBadge tone={active ? INSTALLMENT_TONE[v.status] : 'neutral'}>{active ? installmentStatusText(v) : 'Cancelado'}</StatusBadge>
              </div>
              {active && (
                <div className="flex flex-col gap-1">
                  {v.remaining > 0 && <IconBtn label={`Registrar pagamento de ${v.installment.label}`} onClick={() => register(v.installment.id)}><HandCoins size={15} /></IconBtn>}
                  <IconBtn label={`Editar ${v.installment.label}`} onClick={() => startEdit(v)}><Pencil size={14} /></IconBtn>
                </div>
              )}
            </li>
          ),
        )}
        {editing === 'new' && <li className="p-4"><MobileEdit draft={draft} setDraft={setDraft} onSave={saveEdit} onCancel={() => setEditing(null)} pending={pending} /></li>}
      </ul>

      {items.length === 0 && editing !== 'new' && (
        <p className="border-t border-sand px-5 py-4 text-[13px] text-ink-muted">Nenhuma parcela cadastrada ainda.</p>
      )}

      {/* rodapé: soma das parcelas × valor do contrato */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand px-5 py-3 text-[13px]">
        {active ? (
          diff === 0 ? (
            <span className="flex items-center gap-1.5 text-ok"><CheckCircle2 size={14} aria-hidden /> Parcelas somam o valor do contrato</span>
          ) : (
            <span className={`flex items-center gap-1.5 ${diff > 0 ? 'text-warn' : 'text-danger'}`}>
              <AlertTriangle size={14} aria-hidden />
              {diff > 0 ? `${formatMoney(diff)} do contrato ainda sem parcela` : `Parcelas passam ${formatMoney(-diff)} do contrato`}
              {diff < 0 && (
                <button
                  onClick={() => run(() => contractRepository.save({ ...view.contract, totalValue: view.scheduled }), 'Valor do contrato ajustado')}
                  className="ml-1 font-medium underline underline-offset-4"
                >
                  ajustar contrato para {formatMoney(view.scheduled)}
                </button>
              )}
            </span>
          )
        ) : (
          <span className="text-ink-muted">Contrato cancelado: parcelas em aberto não contam mais como a pagar.</span>
        )}
        <span className="flex items-center gap-3">
          <span className="num text-ink-muted">
            <b className="font-medium text-ink">{formatMoney(view.scheduled)}</b> de {formatMoney(view.contract.totalValue)}
          </span>
          {active && editing !== 'new' && (
            <Button size="sm" variant="ghost" onClick={startNew}><Plus size={14} aria-hidden /> Parcela</Button>
          )}
        </span>
      </div>

      <ConfirmDialog
        open={!!reverse}
        title="Estornar este pagamento?"
        confirmLabel="Estornar"
        danger
        onClose={() => setReverse(null)}
        onConfirm={async () => {
          const p = reverse!;
          setReverse(null);
          await run(() => paymentRepository.reverse(p.id), 'Pagamento estornado');
        }}
      >
        {reverse && `${formatMoney(reverse.amount)} pagos em ${formatShort(reverse.paidAt)}. A parcela volta a ficar em aberto. Ajustes de desconto ou juros feitos no registro não são desfeitos.`}
      </ConfirmDialog>
      <ConfirmDialog
        open={!!confirmDelete}
        title={`Excluir ${confirmDelete?.installment.label ?? ''}?`}
        confirmLabel="Excluir parcela"
        danger
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const v = confirmDelete!;
          setConfirmDelete(null);
          await run(() => installmentRepository.removeSafe(v.installment.id), 'Parcela excluída');
        }}
      >
        {confirmDelete && confirmDelete.paid > 0
          ? 'Esta parcela já tem pagamento registrado, então não pode ser excluída. Estorne o pagamento antes.'
          : `${formatMoney(confirmDelete?.installment.amount ?? 0)} com vencimento em ${confirmDelete ? formatShort(confirmDelete.installment.dueDate) : ''}. O valor volta a ficar “sem parcela” no contrato.`}
      </ConfirmDialog>
    </div>
  );
}

function PaidLine({ v, people, onReverse }: { v: InstallmentView; people: Map<string, string>; onReverse?: (p: Payment) => void }) {
  return (
    <div className="mt-1 text-[12px] text-ink-muted">
      {v.payments.map((p) => (
        <div key={p.id} className="group/pay flex flex-wrap items-center gap-x-1">
          {v.payments.length > 1 && <span className="num">{formatMoney(p.amount)} ·</span>}
          <span>{formatShort(p.paidAt).slice(0, 5)} · {people.get(p.paidBy) ?? '—'} · {PAYMENT_METHOD_LABEL[p.method]}</span>
          {p.receiptUrl && (
            <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">comprovante</a>
          )}
          {onReverse && (
            <button onClick={() => onReverse(p)} className="text-ink-faint underline-offset-2 hover:text-danger hover:underline md:opacity-0 md:group-hover/pay:opacity-100 md:focus:opacity-100">
              estornar
            </button>
          )}
        </div>
      ))}
      {v.installment.adjustmentNote && <div className="text-ink-faint">{v.installment.adjustmentNote}</div>}
    </div>
  );
}

interface EditProps {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  paidNote?: string;
}

function EditRow({ draft, setDraft, onSave, onCancel, pending, paidNote }: EditProps) {
  return (
    <tr className="border-b border-sand/70 bg-cream/40" onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}>
      <td className="px-4 py-2"><TextInput aria-label="Descrição" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="!py-1.5" autoFocus /></td>
      <td className="px-2 py-2"><DateInput aria-label="Vencimento" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className="!py-1.5" /></td>
      <td className="px-2 py-2"><MoneyInput ariaLabel="Valor" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} className="[&_input]:!py-1.5" /></td>
      <td className="px-3 py-2 text-[12px] text-ink-muted">{paidNote}</td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="primary" onClick={onSave} disabled={pending}><Check size={14} aria-hidden /> Salvar</Button>
          <IconBtn label="Cancelar" onClick={onCancel}><X size={14} /></IconBtn>
        </div>
      </td>
    </tr>
  );
}

function MobileEdit({ draft, setDraft, onSave, onCancel, pending }: EditProps) {
  return (
    <div className="space-y-2">
      <TextInput aria-label="Descrição" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <DateInput aria-label="Vencimento" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
        <MoneyInput ariaLabel="Valor" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" variant="primary" onClick={onSave} disabled={pending}>Salvar</Button>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-md p-1.5 text-ink-faint transition-colors hover:bg-cream ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
    >
      {children}
    </button>
  );
}
