import { useEffect, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { expenseRepository } from '../../data/repositories';
import type { Cents, Contract, Installment, Payment, PaymentMethod, Snapshot, Supplier } from '../../domain/types';
import { todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { formatMoney } from '../../lib/money';
import { Button, ChoiceGroup, DateInput, Field, MoneyInput, Select, TextInput } from '../../ui/form';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '../../ui/labels';
import { Sheet } from '../../ui/Sheet';

const NEW = '__new__';

/**
 * Despesa rápida: alianças à vista, prova de cabelo, taxa do cartório…
 * Cria fornecedor (se novo), contrato, parcela única e o pagamento — tudo de uma vez.
 */
export function QuickExpenseSheet({ open, onClose, snapshot, onSaved }: { open: boolean; onClose: () => void; snapshot: Snapshot; onSaved?: (supplierId: string) => void }) {
  const { run, pending } = useMutate();
  const categories = snapshot.categories.filter((c) => c.need !== 'dismissed').sort((a, b) => a.sortOrder - b.sortOrder);
  const people = snapshot.people.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const [what, setWhat] = useState('');
  const [supplierId, setSupplierId] = useState(NEW);
  const [supplierName, setSupplierName] = useState('');
  const [cat, setCat] = useState(categories[0]?.id ?? '');
  const [amount, setAmount] = useState<Cents | null>(null);
  const [date, setDate] = useState(todayISO());
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [payer, setPayer] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setWhat('');
    setSupplierId(NEW);
    setSupplierName('');
    setCat(snapshot.categories.find((c) => c.id === 'cat_outros')?.id ?? categories[0]?.id ?? '');
    setAmount(null);
    setDate(todayISO());
    setPaid(true);
    setMethod('pix');
    let last: string | null = null;
    try {
      last = localStorage.getItem('bia-vini:last-payer');
    } catch {
      /* ok */
    }
    setPayer(people.some((p) => p.id === last) ? last! : (people.find((p) => p.id === 'per_casal') ?? people[0])?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // escolher um fornecedor existente sugere a categoria dele
  useEffect(() => {
    if (supplierId === NEW) return;
    const s = snapshot.suppliers.find((x) => x.id === supplierId);
    if (s) setCat(s.mainCategoryId);
  }, [supplierId, snapshot.suppliers]);

  const name = supplierId === NEW ? supplierName.trim() : snapshot.suppliers.find((s) => s.id === supplierId)?.name ?? '';
  const errors = {
    what: touched && !what.trim() ? 'O que foi comprado?' : null,
    supplier: touched && !name ? 'Informe onde/de quem' : null,
    amount: touched && (!amount || amount <= 0) ? 'Informe o valor' : null,
  };

  async function save() {
    setTouched(true);
    if (!what.trim() || !name || !amount || amount <= 0) return;
    const now = new Date().toISOString();
    const isNew = supplierId === NEW;
    const supplier: Supplier = isNew
      ? { id: newId('suppliers'), name, mainCategoryId: cat, pipelineStatus: 'negotiating', delivered: false, createdAt: now, updatedAt: now }
      : snapshot.suppliers.find((s) => s.id === supplierId)!;
    const contract: Contract = {
      id: newId('contracts'),
      supplierId: supplier.id,
      categoryId: cat,
      title: what.trim(),
      totalValue: amount,
      contractDate: date,
      paymentMethodDefault: method,
      paymentTerms: paid ? 'À vista' : 'Pagamento único',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    const installment: Installment = {
      id: newId('installments'),
      contractId: contract.id,
      label: 'Pagamento único',
      sequence: 1,
      amount,
      dueDate: date,
      createdAt: now,
      updatedAt: now,
    };
    const payment: Payment | null = paid
      ? { id: newId('payments'), contractId: contract.id, installmentId: installment.id, amount, paidAt: date, method, paidBy: payer, createdAt: now, updatedAt: now }
      : null;
    try {
      if (paid) localStorage.setItem('bia-vini:last-payer', payer);
    } catch {
      /* ok */
    }
    const ok = await run(() => expenseRepository.quick({ supplier, isNewSupplier: isNew, contract, installment, payment }), paid ? `Despesa de ${formatMoney(amount)} registrada e paga` : `Despesa de ${formatMoney(amount)} registrada`);
    if (ok) {
      onClose();
      onSaved?.(supplier.id);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={480}
      title="Despesa rápida"
      subtitle="Para compras à vista ou de pagamento único. Entra como contratado (e pago) na categoria."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} disabled={pending}>
            Salvar {amount ? formatMoney(amount) : ''}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="O que foi" error={errors.what}>
          {(id) => <TextInput id={id} data-autofocus value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Ex.: Sapato da noiva, Taxa de habilitação" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" error={errors.amount}>
            {(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}
          </Field>
          <Field label="Data">{(id) => <DateInput id={id} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />}</Field>
        </div>
        <Field label="Onde / de quem" error={supplierId === NEW ? errors.supplier : null}>
          {(id) => (
            <Select id={id} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value={NEW}>+ Novo (digitar nome)</option>
              {[...snapshot.suppliers].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {supplierId === NEW && (
          <Field label="Nome" error={errors.supplier}>
            {(id) => <TextInput id={id} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Ex.: Loja Arezzo, Cartório" />}
          </Field>
        )}
        <Field label="Categoria">
          {(id) => (
            <Select id={id} value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <label className="flex items-center gap-2.5 rounded-xl border border-sand bg-surface px-3.5 py-3 text-[13.5px]">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4" />
          Já foi pago
          <span className="ml-auto text-[12px] text-ink-muted">{paid ? 'registra o pagamento junto' : 'fica a pagar nesta data'}</span>
        </label>

        {paid && (
          <>
            <Field label="Forma">
              {() => <ChoiceGroup label="Forma" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))} />}
            </Field>
            <Field label="Quem pagou">
              {() => <ChoiceGroup label="Quem pagou" value={payer} onChange={setPayer} options={people.map((p) => ({ value: p.id, label: p.name }))} />}
            </Field>
          </>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
