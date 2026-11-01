import { useEffect, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { contractRepository } from '../../data/repositories';
import type { ScheduleItem } from '../../domain/finance';
import type { Cents, Contract, Installment, PaymentMethod, Quote, Snapshot } from '../../domain/types';
import { todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { formatMoney } from '../../lib/money';
import { Button, DateInput, Field, MoneyInput, Select, TextInput } from '../../ui/form';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '../../ui/labels';
import { Sheet } from '../../ui/Sheet';
import { ScheduleGenerator } from './ScheduleGenerator';

interface Props {
  open: boolean;
  onClose: () => void;
  snapshot: Snapshot;
  supplierId: string;
  /** editar contrato existente (sem cronograma: ele é editado na tabela de parcelas) */
  contract?: Contract;
  /** contratar a partir desta proposta (pré-preenche valor, condições e categoria) */
  quoteId?: string;
}

/** Novo contrato: dados + cronograma gerado e editável, salvos num único commit */
export function ContractForm({ open, onClose, snapshot, supplierId, contract, quoteId }: Props) {
  const { run, pending } = useMutate();
  const supplier = snapshot.suppliers.find((s) => s.id === supplierId)!;
  const categories = snapshot.categories.filter((c) => c.need !== 'dismissed').sort((a, b) => a.sortOrder - b.sortOrder);
  const fromQuote = quoteId ? snapshot.quotes.find((q) => q.id === quoteId) : undefined;
  const openQuote = (catId: string): Quote | undefined =>
    fromQuote && fromQuote.categoryId === catId
      ? fromQuote
      : snapshot.quotes.filter((q) => q.supplierId === supplierId && q.categoryId === catId && q.status === 'open').sort((a, b) => Number(b.favorite) - Number(a.favorite))[0];

  const [categoryId, setCategoryId] = useState(supplier.mainCategoryId);
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState<Cents | null>(null);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [terms, setTerms] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [rows, setRows] = useState<ScheduleItem[]>([]);
  const [touched, setTouched] = useState(false);
  const [declineOthers, setDeclineOthers] = useState(true);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (contract) {
      setCategoryId(contract.categoryId);
      setTitle(contract.title);
      setTotal(contract.totalValue);
      setDate(contract.contractDate);
      setMethod(contract.paymentMethodDefault ?? 'pix');
      setTerms(contract.paymentTerms ?? '');
      setDocUrl(contract.documentUrl ?? '');
    } else {
      const startCat = fromQuote?.categoryId ?? supplier.mainCategoryId;
      const q = openQuote(startCat);
      setDeclineOthers(true);
      setCategoryId(startCat);
      setTitle('');
      setTotal(q?.amount ?? null);
      setDate(todayISO());
      setMethod('pix');
      setTerms(q?.paymentTerms ?? '');
      setDocUrl(q?.url ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id]);

  const catName = categories.find((c) => c.id === categoryId)?.name ?? '';
  const totalError = touched && (!total || total <= 0) ? 'Informe o valor contratado' : null;
  const sum = rows.reduce((s, r) => s + r.amount, 0);
  const overScheduled = !contract && total !== null && sum > total;
  const quote = !contract ? openQuote(categoryId) : undefined;
  const competing = !contract ? snapshot.quotes.filter((q) => q.categoryId === categoryId && q.status === 'open' && q.supplierId !== supplierId) : [];

  async function save() {
    setTouched(true);
    if (!total || total <= 0 || overScheduled) return;
    const now = new Date().toISOString();
    const base = {
      categoryId,
      title: title.trim() || catName,
      totalValue: total,
      contractDate: date,
      paymentMethodDefault: method,
      paymentTerms: terms.trim() || undefined,
      documentUrl: docUrl.trim() || undefined,
    };
    if (contract) {
      const ok = await run(() => contractRepository.save({ ...contract, ...base }), 'Contrato atualizado');
      if (ok) onClose();
      return;
    }
    const record: Contract = { id: newId('contracts'), supplierId, status: 'active', quoteId: quote?.id, createdAt: now, updatedAt: now, ...base };
    const installments: Installment[] = rows.map((r, i) => ({
      id: `${newId('installments')}${i}`,
      contractId: record.id,
      label: r.label.trim() || `Parcela ${i + 1}`,
      sequence: i + 1,
      amount: r.amount,
      dueDate: r.dueDate,
      createdAt: now,
      updatedAt: now,
    }));
    const acceptedQuote = quote ? { ...quote, status: 'accepted' as const, contractId: record.id } : null;
    const ok = await run(
      () => contractRepository.createWithInstallments(record, installments, acceptedQuote, declineOthers ? competing : []),
      `Contrato salvo${installments.length ? ` com ${installments.length} ${installments.length === 1 ? 'pagamento' : 'pagamentos'}` : ''}`,
    );
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={600}
      title={contract ? 'Editar contrato' : 'Novo contrato'}
      subtitle={supplier.name}
      footer={
        <>
          {!contract && total ? <span className="mr-auto text-[12.5px] text-ink-muted">Contratado: <b className="num font-medium text-ink">{formatMoney(total)}</b></span> : null}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} disabled={pending || overScheduled}>
            {contract ? 'Salvar' : rows.length ? 'Salvar contrato e parcelas' : 'Salvar contrato'}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor total contratado" error={totalError} hint={quote && !contract ? `Proposta: ${formatMoney(quote.amount)}` : undefined}>
            {(id) => <MoneyInput id={id} value={total} onChange={setTotal} autoFocus />}
          </Field>
          <Field label="Data da contratação">{(id) => <DateInput id={id} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />}</Field>
          <Field label="Categoria" hint="Onde o gasto conta no orçamento">
            {(id) => (
              <Select id={id} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Forma de pagamento">
            {(id) => (
              <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Descrição" hint="opcional">
          {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={catName ? `Ex.: ${catName} completo · 150 pessoas` : ''} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Condições" hint="opcional">
            {(id) => <TextInput id={id} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Entrada + 5x" />}
          </Field>
          <Field label="Link do contrato" hint="opcional">
            {(id) => <TextInput id={id} type="url" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://drive…" />}
          </Field>
        </div>

        {competing.length > 0 && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-sand bg-surface p-3.5 text-[13px]">
            <input type="checkbox" checked={declineOthers} onChange={(e) => setDeclineOthers(e.target.checked)} className="mt-0.5" />
            <span>
              Marcar as outras {competing.length} {competing.length === 1 ? 'proposta' : 'propostas'} de {catName} como descartadas
              <span className="block text-[12px] text-ink-muted">
                {competing.map((q) => snapshot.suppliers.find((s) => s.id === q.supplierId)?.name).join(', ')} · ficam guardadas para consulta
              </span>
            </span>
          </label>
        )}

        {!contract && (
          <section className="border-t border-sand pt-5">
            <h3 className="mb-3 text-[16px] font-bold">Cronograma de pagamento</h3>
            <ScheduleGenerator total={total} baseDate={date} rows={rows} onChange={setRows} />
          </section>
        )}
        {contract && (
          <p className="rounded-lg bg-cream px-3 py-2.5 text-[13px] text-ink-muted">
            As parcelas são editadas direto na tabela do fornecedor. Se mudar o valor total, o sistema avisa quando as parcelas não fecharem.
          </p>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
