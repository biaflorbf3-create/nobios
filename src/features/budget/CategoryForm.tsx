import { useEffect, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { categoryRepository } from '../../data/repositories';
import type { Category, CategoryNeed, Cents, Snapshot } from '../../domain/types';
import { newId } from '../../lib/ids';
import { formatMoney } from '../../lib/money';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button, ChoiceGroup, Field, MoneyInput, Select, TextInput } from '../../ui/form';
import { Sheet } from '../../ui/Sheet';

export const NEED_LABEL: Record<CategoryNeed, string> = {
  required: 'Necessária',
  optional: 'Opcional',
  dismissed: 'Dispensada',
};
const NEED_HINT: Record<CategoryNeed, string> = {
  required: 'Conta como pendência enquanto não houver contrato.',
  optional: 'Pode ter orçamento, mas não vira pendência.',
  dismissed: 'Não faz parte do casamento: sai do orçamento e das pendências.',
};

/** Criar ou editar categoria. A exclusão move contratos e fornecedores para outra categoria. */
export function CategoryForm({ open, onClose, snapshot, category }: { open: boolean; onClose: () => void; snapshot: Snapshot; category?: Category }) {
  const { run, pending } = useMutate();
  const [name, setName] = useState('');
  const [planned, setPlanned] = useState<Cents | null>(null);
  const [need, setNeed] = useState<CategoryNeed>('required');
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const others = snapshot.categories.filter((c) => c.id !== category?.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const [moveTo, setMoveTo] = useState('');

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setName(category?.name ?? '');
    setPlanned(category?.plannedBudget ?? null);
    setNeed(category?.need ?? 'required');
    setMoveTo(snapshot.categories.find((c) => c.name === 'Outros' && c.id !== category?.id)?.id ?? others[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id]);

  const duplicate = snapshot.categories.some((c) => c.id !== category?.id && c.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nameError = touched && !name.trim() ? 'Informe o nome' : duplicate ? 'Já existe uma categoria com esse nome' : null;
  const linked = category
    ? {
        contracts: snapshot.contracts.filter((c) => c.categoryId === category.id),
        quotes: snapshot.quotes.filter((q) => q.categoryId === category.id).length,
        suppliers: snapshot.suppliers.filter((s) => s.mainCategoryId === category.id).length,
      }
    : null;
  const linkedCount = linked ? linked.contracts.length + linked.quotes + linked.suppliers : 0;
  const activeContracts = linked?.contracts.filter((c) => c.status === 'active') ?? [];

  async function save() {
    setTouched(true);
    if (!name.trim() || duplicate) return;
    const now = new Date().toISOString();
    const record: Category = category
      ? { ...category, name: name.trim(), plannedBudget: planned, need }
      : {
          id: newId('categories'),
          name: name.trim(),
          plannedBudget: planned,
          need,
          sortOrder: Math.max(0, ...snapshot.categories.map((c) => c.sortOrder)) + 1,
          createdAt: now,
          updatedAt: now,
        };
    if (await run(() => categoryRepository.save(record), category ? 'Categoria atualizada' : 'Categoria criada')) onClose();
  }

  return (
    <>
      <Sheet
        open={open && !deleting}
        onClose={onClose}
        width={460}
        title={category ? 'Editar categoria' : 'Nova categoria'}
        subtitle={category ? category.name : 'Ex.: Cabine de fotos, Seguro, Ensaio pré-wedding'}
        footer={
          <>
            {category && (
              <Button variant="danger" className="mr-auto" onClick={() => setDeleting(true)}>
                Excluir
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} disabled={pending}>
              Salvar
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
          <Field label="Nome" error={nameError}>
            {(id) => <TextInput id={id} data-autofocus value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Orçamento planejado" hint={need === 'dismissed' ? 'Categorias dispensadas não entram no orçamento.' : 'Deixe em branco se ainda não definiram.'}>
            {(id) => <MoneyInput id={id} value={planned} onChange={setPlanned} />}
          </Field>
          <Field label="Situação" hint={NEED_HINT[need]}>
            {() => (
              <ChoiceGroup
                label="Situação"
                value={need}
                onChange={setNeed}
                options={(Object.keys(NEED_LABEL) as CategoryNeed[]).map((n) => ({ value: n, label: NEED_LABEL[n] }))}
              />
            )}
          </Field>
          {need === 'dismissed' && activeContracts.length > 0 && (
            <p className="rounded-lg bg-warn/10 px-3 py-2.5 text-[13px] text-warn">
              Há {activeContracts.length} contrato(s) ativo(s) nesta categoria. Eles continuam contando no total contratado, mas a categoria sai do orçamento.
            </p>
          )}
          <button type="submit" className="hidden" />
        </form>
      </Sheet>

      <ConfirmDialog
        open={open && deleting}
        title={`Excluir “${category?.name}”?`}
        confirmLabel={linkedCount ? 'Mover e excluir' : 'Excluir'}
        danger
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          const ok = await run(() => categoryRepository.remove(category!.id, linkedCount ? moveTo : undefined), 'Categoria excluída');
          setDeleting(false);
          if (ok) onClose();
        }}
      >
        {linkedCount ? (
          <div className="space-y-3">
            <p>
              Ligados a ela: {linked!.contracts.length > 0 && `${linked!.contracts.length} contrato(s) (${formatMoney(linked!.contracts.reduce((s, c) => s + c.totalValue, 0))}), `}
              {linked!.quotes > 0 && `${linked!.quotes} proposta(s), `}
              {linked!.suppliers > 0 && `${linked!.suppliers} fornecedor(es)`}. Para onde mover?
            </p>
            <Select aria-label="Mover para" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          'Nenhum contrato ou fornecedor está ligado a ela.'
        )}
      </ConfirmDialog>
    </>
  );
}
