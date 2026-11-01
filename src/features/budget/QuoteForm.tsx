import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { quoteRepository } from '../../data/repositories';
import type { Cents, Quote, Snapshot, Supplier } from '../../domain/types';
import { todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { Button, Field, MoneyInput, Select, TextArea, TextInput } from '../../ui/form';
import { Sheet } from '../../ui/Sheet';

const NEW = '__new__';

interface Props {
  open: boolean;
  onClose: () => void;
  snapshot: Snapshot;
  categoryId?: string;
  quote?: Quote;
}

/** Nova proposta (de fornecedor já cadastrado ou novo) ou edição */
export function QuoteForm({ open, onClose, snapshot, categoryId, quote }: Props) {
  const { run, pending } = useMutate();
  const categories = snapshot.categories.filter((c) => c.need !== 'dismissed').sort((a, b) => a.sortOrder - b.sortOrder);
  const [cat, setCat] = useState(categoryId ?? categories[0]?.id ?? '');
  const [supplierId, setSupplierId] = useState<string>(NEW);
  const [newName, setNewName] = useState('');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState<Cents | null>(null);
  const [terms, setTerms] = useState('');
  const [details, setDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (quote) {
      setCat(quote.categoryId);
      setSupplierId(quote.supplierId);
      setAmount(quote.amount);
      setTerms(quote.paymentTerms ?? '');
      setDetails(quote.details ?? '');
      setNotes(quote.notes ?? '');
      setUrl(quote.url ?? '');
      setFavorite(quote.favorite);
    } else {
      const c = categoryId ?? categories[0]?.id ?? '';
      setCat(c);
      setSupplierId(NEW);
      setNewName('');
      setContact('');
      setAmount(null);
      setTerms('');
      setDetails('');
      setNotes('');
      setUrl('');
      setFavorite(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote?.id, categoryId]);

  // fornecedores da categoria primeiro
  const suppliers = [...snapshot.suppliers]
    .filter((s) => s.pipelineStatus !== 'cancelled')
    .sort((a, b) => Number(b.mainCategoryId === cat) - Number(a.mainCategoryId === cat) || a.name.localeCompare(b.name));
  const inCat = suppliers.filter((s) => s.mainCategoryId === cat);
  const outCat = suppliers.filter((s) => s.mainCategoryId !== cat);

  const errors = {
    supplier: touched && supplierId === NEW && !newName.trim() ? 'Informe o fornecedor' : null,
    amount: touched && (!amount || amount <= 0) ? 'Informe o valor' : null,
  };

  async function save() {
    setTouched(true);
    if ((supplierId === NEW && !newName.trim()) || !amount || amount <= 0) return;
    const now = new Date().toISOString();
    const base = {
      categoryId: cat,
      amount,
      paymentTerms: terms.trim() || undefined,
      details: details.trim() || undefined,
      notes: notes.trim() || undefined,
      url: url.trim() || undefined,
      favorite,
    };
    if (quote) {
      if (await run(() => quoteRepository.save({ ...quote, ...base, supplierId }), 'Proposta atualizada')) onClose();
      return;
    }
    if (supplierId === NEW) {
      const supplier: Supplier = {
        id: newId('suppliers'),
        name: newName.trim(),
        mainCategoryId: cat,
        contactName: contact.trim() || undefined,
        pipelineStatus: 'quoted',
        delivered: false,
        createdAt: now,
        updatedAt: now,
      };
      const q: Quote = { id: newId('quotes'), supplierId: supplier.id, status: 'open', receivedAt: todayISO(), createdAt: now, updatedAt: now, ...base };
      if (await run(() => quoteRepository.saveWithNewSupplier(q, supplier), 'Proposta cadastrada')) onClose();
      return;
    }
    const q: Quote = { id: newId('quotes'), supplierId, status: 'open', receivedAt: todayISO(), createdAt: now, updatedAt: now, ...base };
    if (await run(() => quoteRepository.save(q), 'Proposta cadastrada')) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={500}
      title={quote ? 'Editar proposta' : 'Nova proposta'}
      subtitle={quote ? snapshot.suppliers.find((s) => s.id === quote.supplierId)?.name : 'Para comparar antes de contratar'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} disabled={pending}>
            Salvar proposta
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
        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Valor" error={errors.amount}>
            {(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}
          </Field>
        </div>

        {!quote && (
          <Field label="Fornecedor" error={supplierId !== NEW ? null : errors.supplier}>
            {(id) => (
              <Select id={id} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value={NEW}>+ Novo fornecedor</option>
                {inCat.length > 0 && (
                  <optgroup label="Desta categoria">
                    {inCat.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Outros">
                  {outCat.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            )}
          </Field>
        )}
        {!quote && supplierId === NEW && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do fornecedor" error={errors.supplier}>
              {(id) => <TextInput id={id} data-autofocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Banda Aurora" />}
            </Field>
            <Field label="Contato" hint="opcional">
              {(id) => <TextInput id={id} value={contact} onChange={(e) => setContact(e.target.value)} />}
            </Field>
          </div>
        )}

        <Field label="Condições de pagamento" hint="opcional">
          {(id) => <TextInput id={id} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="30% de entrada + 3x" />}
        </Field>
        <Field label="O que inclui" hint="opcional">
          {(id) => <TextArea id={id} rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Horas, itens, equipe…" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Link da proposta" hint="opcional">
            {(id) => <TextInput id={id} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />}
          </Field>
          <Field label="Observações" hint="opcional">
            {(id) => <TextInput id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
        </div>
        <button
          type="button"
          onClick={() => setFavorite((f) => !f)}
          aria-pressed={favorite}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] ${favorite ? 'border-accent bg-accent/10 text-accent' : 'border-sand text-ink-muted hover:text-ink'}`}
        >
          <Heart size={14} className={favorite ? 'fill-accent' : ''} aria-hidden /> {favorite ? 'Favorita' : 'Marcar como favorita'}
        </button>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
