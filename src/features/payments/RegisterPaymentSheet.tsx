import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { paymentRepository } from '../../data/repositories';
import { installmentStatusText, planPayment, type Finance, type InstallmentView } from '../../domain/finance';
import type { Cents, Payment, PaymentMethod, Snapshot } from '../../domain/types';
import { formatShort, todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { formatMoney } from '../../lib/money';
import { Button, ChoiceGroup, DateInput, Field, MoneyInput, Select, TextInput } from '../../ui/form';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '../../ui/labels';
import { Sheet } from '../../ui/Sheet';
import { StatusBadge } from '../../ui/StatusBadge';
import { INSTALLMENT_TONE } from '../../ui/tones';

const LAST_PAYER = 'bia-vini:last-payer';

function readLastPayer(): string | null {
  try {
    return localStorage.getItem(LAST_PAYER);
  } catch {
    return null;
  }
}
function writeLastPayer(id: string) {
  try {
    localStorage.setItem(LAST_PAYER, id);
  } catch {
    /* sem armazenamento: tudo bem */
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  snapshot: Snapshot;
  finance: Finance;
  /** parcela escolhida; sem ela, a pessoa escolhe numa lista das abertas */
  installmentId: string | null;
}

/**
 * Registrar pagamento — o caso comum é 2 cliques: "Registrar" na parcela e Enter.
 * Valor = restante, data = hoje, forma = a do contrato, quem pagou = o último usado.
 */
export function RegisterPaymentSheet({ open, onClose, snapshot, finance, installmentId }: Props) {
  const { run, pending } = useMutate();
  const openInstallments = useMemo(
    () => finance.installments.filter((v) => v.contract.status === 'active' && v.remaining > 0),
    [finance],
  );
  const [chosen, setChosen] = useState<string | null>(installmentId);
  const view: InstallmentView | undefined = finance.installments.find((v) => v.installment.id === (installmentId ?? chosen));
  const supplierName = (id: string) => snapshot.suppliers.find((s) => s.id === id)?.name ?? '';
  const people = snapshot.people.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder);

  const [amount, setAmount] = useState<Cents | null>(null);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [payer, setPayer] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState('');
  const [settle, setSettle] = useState(false);
  const [acceptSurcharge, setAcceptSurcharge] = useState(false);

  // pré-preenche ao abrir ou ao trocar de parcela
  useEffect(() => {
    if (!open) return;
    if (installmentId) setChosen(installmentId);
  }, [open, installmentId]);

  useEffect(() => {
    if (!open || !view) return;
    setAmount(view.remaining);
    setDate(todayISO());
    setMethod(view.contract.paymentMethodDefault ?? 'pix');
    const last = readLastPayer();
    setPayer(people.some((p) => p.id === last) ? last! : (people.find((p) => p.id === 'per_casal') ?? people[0])?.id ?? '');
    setNotes('');
    setReceipt('');
    setSettle(false);
    setAcceptSurcharge(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view?.installment.id]);

  useEffect(() => {
    if (!open) setChosen(null);
  }, [open]);

  const remaining = view?.remaining ?? 0;
  const less = amount !== null && amount > 0 && amount < remaining;
  const more = amount !== null && amount > remaining;
  const invalid = !view || !amount || amount <= 0 || !payer || (more && !acceptSurcharge);

  async function save() {
    if (invalid || !view || !amount) return;
    const now = new Date().toISOString();
    const payment: Payment = {
      id: newId('payments'),
      contractId: view.contract.id,
      installmentId: view.installment.id,
      amount,
      paidAt: date,
      method,
      paidBy: payer,
      notes: notes.trim() || undefined,
      receiptUrl: receipt.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    const plan = planPayment(view.installment, view.contract, view.paid, amount, settle);
    writeLastPayer(payer);
    const msg =
      plan.mode === 'partial'
        ? `Pagamento parcial registrado · restam ${formatMoney(remaining - amount)}`
        : plan.mode === 'discount'
          ? 'Pagamento registrado com desconto'
          : 'Pagamento registrado ✓';
    const ok = await run(() => paymentRepository.register(payment, plan), msg);
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={480}
      title="Registrar pagamento"
      subtitle={
        view ? (
          <span>
            {supplierName(view.contract.supplierId)} · {view.installment.label} · vence {formatShort(view.installment.dueDate)}
          </span>
        ) : (
          'Escolha a parcela'
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} disabled={invalid || pending}>
            Registrar {amount ? formatMoney(amount) : ''} <span className="ml-1 text-[11px] opacity-60">↵</span>
          </Button>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {!installmentId && (
          <Field label="Parcela">
            {(id) => (
              <Select id={id} value={chosen ?? ''} onChange={(e) => setChosen(e.target.value || null)} data-autofocus>
                <option value="">Escolha…</option>
                {openInstallments.map((v) => (
                  <option key={v.installment.id} value={v.installment.id}>
                    {formatShort(v.installment.dueDate)} · {supplierName(v.contract.supplierId)} · {v.installment.label} · {formatMoney(v.remaining)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {view && (
          <>
            <div className="flex items-center justify-between rounded-xl border border-sand bg-surface px-4 py-3">
              <div>
                <div className="label">Restante da parcela</div>
                <div className="num mt-1 text-[22px] font-semibold">{formatMoney(remaining)}</div>
                {view.paid > 0 && <div className="text-[12px] text-ink-muted">já pago {formatMoney(view.paid)} de {formatMoney(view.installment.amount)}</div>}
              </div>
              <StatusBadge tone={INSTALLMENT_TONE[view.status]}>{installmentStatusText(view)}</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor pago">{(id) => <MoneyInput id={id} value={amount} onChange={setAmount} autoFocus={!!installmentId} />}</Field>
              <Field label="Data do pagamento">{(id) => <DateInput id={id} value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />}</Field>
            </div>

            {less && (
              <div className="space-y-2 rounded-xl border border-warn/30 bg-warn/5 p-3.5 text-[13px]">
                <div className="font-medium text-ink">Valor menor que o restante. O que aconteceu?</div>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="radio" name="less" checked={!settle} onChange={() => setSettle(false)} className="mt-0.5" />
                  <span>
                    Pagamento parcial
                    <span className="block text-[12px] text-ink-muted">Restam {formatMoney(remaining - (amount ?? 0))} em aberto nesta parcela</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="radio" name="less" checked={settle} onChange={() => setSettle(true)} className="mt-0.5" />
                  <span>
                    Quitar com desconto
                    <span className="block text-[12px] text-ink-muted">
                      Parcela e contrato diminuem {formatMoney(remaining - (amount ?? 0))}
                    </span>
                  </span>
                </label>
              </div>
            )}
            {more && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-warn/30 bg-warn/5 p-3.5 text-[13px]">
                <input type="checkbox" checked={acceptSurcharge} onChange={(e) => setAcceptSurcharge(e.target.checked)} className="mt-0.5" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle size={13} className="text-warn" aria-hidden /> Valor {formatMoney((amount ?? 0) - remaining)} maior que o restante
                  </span>
                  <span className="block text-[12px] text-ink-muted">Marque para registrar como juros/multa: parcela e contrato aumentam essa diferença.</span>
                </span>
              </label>
            )}

            <Field label="Forma de pagamento">
              {() => <ChoiceGroup label="Forma de pagamento" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))} />}
            </Field>
            <Field label="Quem pagou">
              {() => <ChoiceGroup label="Quem pagou" value={payer} onChange={setPayer} options={people.map((p) => ({ value: p.id, label: p.name }))} />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Observação" hint="opcional">
                {(id) => <TextInput id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
              </Field>
              <Field label="Comprovante" hint="link · opcional">
                {(id) => <TextInput id={id} type="url" value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="https://" />}
              </Field>
            </div>
          </>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
