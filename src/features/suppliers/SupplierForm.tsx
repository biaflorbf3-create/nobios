import { useEffect, useState } from 'react';
import { supplierRepository } from '../../data/repositories';
import { useMutate } from '../../data/hooks/useMutate';
import { bestQuote } from '../../domain/finance';
import type { Cents, PipelineStatus, Snapshot, Supplier } from '../../domain/types';
import { newId } from '../../lib/ids';
import { todayISO } from '../../lib/dates';
import { Button, ChoiceGroup, Field, MoneyInput, Select, TextArea, TextInput } from '../../ui/form';
import { PIPELINE_LABEL } from '../../ui/labels';
import { Sheet } from '../../ui/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  snapshot: Snapshot;
  /** editar um existente; sem ele, cadastra novo */
  supplier?: Supplier;
  defaultCategoryId?: string;
  /** chamado após salvar; `andContract` = clicou em "Salvar e cadastrar contrato" */
  onSaved?: (supplierId: string, andContract: boolean) => void;
}

const PIPELINE_OPTIONS = (['researching', 'quoted', 'negotiating'] as PipelineStatus[]).map((v) => ({ value: v, label: PIPELINE_LABEL[v] }));

type Draft = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'delivered'>;

function emptyDraft(categoryId: string): Draft {
  return { name: '', mainCategoryId: categoryId, pipelineStatus: 'quoted', contactName: '', phone: '', whatsapp: '', email: '', instagram: '', website: '', notes: '' };
}

/** Cadastro rápido: só nome e categoria são obrigatórios */
export function SupplierForm({ open, onClose, snapshot, supplier, defaultCategoryId, onSaved }: Props) {
  const { run, pending } = useMutate();
  const categories = snapshot.categories.filter((c) => c.need !== 'dismissed').sort((a, b) => a.sortOrder - b.sortOrder);
  const existingQuote = supplier ? bestQuote(snapshot.quotes.filter((q) => q.supplierId === supplier.id)) : null;
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultCategoryId ?? categories[0]?.id));
  const [quoteAmount, setQuoteAmount] = useState<Cents | null>(null);
  const [touched, setTouched] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (supplier) {
      const { id: _id, createdAt: _c, updatedAt: _u, delivered: _d, ...rest } = supplier;
      setDraft({ ...emptyDraft(supplier.mainCategoryId), ...rest });
      setQuoteAmount(existingQuote?.amount ?? null);
      setMore(Boolean(supplier.email || supplier.instagram || supplier.website || supplier.phone));
    } else {
      setDraft(emptyDraft(defaultCategoryId ?? categories[0]?.id));
      setQuoteAmount(null);
      setMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier?.id]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const nameError = touched && !draft.name.trim() ? 'Informe o nome do fornecedor' : null;
  const contracted = supplier ? snapshot.contracts.some((c) => c.supplierId === supplier.id && c.status === 'active') : false;

  async function save(andContract: boolean) {
    setTouched(true);
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const clean = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v])) as Draft;
    const record: Supplier = supplier
      ? { ...supplier, ...clean, name: draft.name.trim() }
      : { id: newId('suppliers'), ...clean, name: draft.name.trim(), delivered: false, createdAt: now, updatedAt: now };
    let quote = null;
    if (quoteAmount !== null && quoteAmount !== existingQuote?.amount) {
      quote = existingQuote
        ? { ...existingQuote, amount: quoteAmount }
        : {
            id: newId('quotes'),
            supplierId: record.id,
            categoryId: record.mainCategoryId,
            amount: quoteAmount,
            favorite: false,
            status: 'open' as const,
            receivedAt: todayISO(),
            createdAt: now,
            updatedAt: now,
          };
    }
    const ok = await run(() => supplierRepository.saveWithQuote(record, quote), supplier ? 'Fornecedor atualizado' : 'Fornecedor cadastrado');
    if (ok) {
      onClose();
      onSaved?.(record.id, andContract);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={supplier ? 'Editar fornecedor' : 'Novo fornecedor'}
      subtitle={supplier ? supplier.name : 'Só nome e categoria são obrigatórios. O resto pode vir depois.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {!supplier && (
            <Button onClick={() => save(true)} disabled={pending}>
              Salvar e cadastrar contrato
            </Button>
          )}
          <Button variant="primary" onClick={() => save(false)} disabled={pending}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <Field label="Nome" error={nameError}>
          {(id) => <TextInput id={id} data-autofocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Buffet Bella" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            {(id) => (
              <Select id={id} value={draft.mainCategoryId} onChange={(e) => set('mainCategoryId', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Valor da proposta" hint="opcional">
            {(id) => <MoneyInput id={id} value={quoteAmount} onChange={setQuoteAmount} />}
          </Field>
        </div>

        <Field label="Status">
          {() =>
            contracted ? (
              <p className="rounded-lg bg-ok/10 px-3 py-2 text-[13px] text-ok">Contratado: definido automaticamente porque há contrato ativo.</p>
            ) : (
              <ChoiceGroup label="Status" value={draft.pipelineStatus === 'cancelled' ? 'negotiating' : draft.pipelineStatus} options={PIPELINE_OPTIONS} onChange={(v) => set('pipelineStatus', v)} />
            )
          }
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Contato">
            {(id) => <TextInput id={id} value={draft.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} placeholder="Nome" />}
          </Field>
          <Field label="WhatsApp">
            {(id) => <TextInput id={id} type="tel" value={draft.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />}
          </Field>
        </div>

        {more ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone">
                {(id) => <TextInput id={id} type="tel" value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />}
              </Field>
              <Field label="E-mail">
                {(id) => <TextInput id={id} type="email" value={draft.email ?? ''} onChange={(e) => set('email', e.target.value)} />}
              </Field>
              <Field label="Instagram">
                {(id) => <TextInput id={id} value={draft.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} placeholder="@perfil" />}
              </Field>
              <Field label="Site">
                {(id) => <TextInput id={id} type="url" value={draft.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" />}
              </Field>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="text-[13px] font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
            + Telefone, e-mail, Instagram e site
          </button>
        )}

        <Field label="Observações">
          {(id) => <TextArea id={id} value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="O que é importante lembrar sobre este fornecedor" />}
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
