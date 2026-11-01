import { ArrowRight, Check, Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { useFinance } from '../../data/hooks/useSnapshot';
import { personRepository, resetDemoData, weddingRepository } from '../../data/repositories';
import { dataSource, githubRepo } from '../../data/sources';
import { useQueryClient } from '@tanstack/react-query';
import { SNAPSHOT_KEY } from '../../data/hooks/useSnapshot';
import { ExternalLink, History } from 'lucide-react';
import type { Cents, Person, Snapshot, Wedding } from '../../domain/types';
import { daysBetween, formatLong, todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { formatMoney } from '../../lib/money';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button, DateInput, Field, MoneyInput, TextInput } from '../../ui/form';

/** Paleta discreta para identificar quem pagou nos gráficos */
const PERSON_COLORS = ['#C084FC', '#4A453E', '#7A6A55', '#8B5CF6', '#5C6F80', '#DB2777', '#9A9287', '#6366F1'];

export function SettingsPage() {
  const data = useFinance();
  if (!data) return null;
  const { snapshot } = data;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Ajustes</h1>
        <p className="mt-2.5 text-[14px] text-ink-muted">Coisas que mudam pouco. Tudo aqui reflete na hora em todas as telas.</p>
      </header>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <WeddingCard wedding={snapshot.wedding} />
        <PeopleCard snapshot={snapshot} />
        <AlertsCard wedding={snapshot.wedding} />
        <div className="space-y-5">
          <Section title="Categorias">
            <p className="text-[13.5px] text-ink-muted">
              {snapshot.categories.filter((c) => c.need !== 'dismissed').length} categorias ativas,{' '}
              {snapshot.categories.filter((c) => c.need === 'dismissed').length} dispensadas. Crie, renomeie, defina orçamento e situação na tela de Orçamento.
            </p>
            <a href="#orcamento" className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium hover:text-accent">
              Ir para Orçamento <ArrowRight size={14} aria-hidden />
            </a>
          </Section>
          {dataSource.kind === 'http' ? <GitHubCard /> : <DemoCard />}
        </div>
      </div>
    </div>
  );
}

function WeddingCard({ wedding }: { wedding: Wedding }) {
  const { run, pending } = useMutate();
  const [name, setName] = useState(wedding.coupleName);
  const [date, setDate] = useState(wedding.weddingDate);
  const [budget, setBudget] = useState<Cents | null>(wedding.totalBudget);
  useEffect(() => {
    setName(wedding.coupleName);
    setDate(wedding.weddingDate);
    setBudget(wedding.totalBudget);
  }, [wedding]);
  const dirty = name !== wedding.coupleName || date !== wedding.weddingDate || budget !== wedding.totalBudget;
  const valid = name.trim() && date && budget && budget > 0;
  const days = date ? daysBetween(todayISO(), date) : null;
  return (
    <Section title="Casamento">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && dirty) run(() => weddingRepository.save({ ...wedding, coupleName: name.trim(), weddingDate: date, totalBudget: budget! }), 'Dados do casamento salvos');
        }}
      >
        <Field label="Nome do casal">{(id) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" hint={days !== null && days >= 0 ? `${formatLong(date)} · faltam ${days} dias` : undefined}>
            {(id) => <DateInput id={id} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Teto do orçamento" hint="Base do “orçamento comprometido”">
            {(id) => <MoneyInput id={id} value={budget} onChange={setBudget} />}
          </Field>
        </div>
        <SaveRow dirty={dirty} disabled={!valid || pending} />
      </form>
    </Section>
  );
}

function AlertsCard({ wedding }: { wedding: Wedding }) {
  const { run, pending } = useMutate();
  const [soon, setSoon] = useState(wedding.dueSoonDays);
  const [near, setNear] = useState(wedding.nearLimitPct);
  const [overall, setOverall] = useState(wedding.overallAlertPct);
  useEffect(() => {
    setSoon(wedding.dueSoonDays);
    setNear(wedding.nearLimitPct);
    setOverall(wedding.overallAlertPct);
  }, [wedding]);
  const dirty = soon !== wedding.dueSoonDays || near !== wedding.nearLimitPct || overall !== wedding.overallAlertPct;
  const valid = soon >= 0 && soon <= 60 && near > 0 && near <= 100 && overall > 0 && overall <= 100;
  return (
    <Section title="Limites dos alertas">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && dirty) run(() => weddingRepository.save({ ...wedding, dueSoonDays: soon, nearLimitPct: near, overallAlertPct: overall }), 'Limites salvos');
        }}
      >
        <NumberRow label="“Vence em breve” quando faltam até" unit="dias" value={soon} onChange={setSoon} min={0} max={60} />
        <NumberRow label="Categoria “próxima do limite” a partir de" unit="% do planejado" value={near} onChange={setNear} min={1} max={100} />
        <NumberRow label="Alerta de orçamento geral a partir de" unit="% do teto comprometido" value={overall} onChange={setOverall} min={1} max={100} />
        <SaveRow dirty={dirty} disabled={!valid || pending} />
      </form>
    </Section>
  );
}

function PeopleCard({ snapshot }: { snapshot: Snapshot }) {
  const { run } = useMutate();
  const [newName, setNewName] = useState('');
  const [remove, setRemove] = useState<Person | null>(null);
  const people = [...snapshot.people].sort((a, b) => a.sortOrder - b.sortOrder);
  const paidBy = new Map<string, number>();
  for (const p of snapshot.payments) paidBy.set(p.paidBy, (paidBy.get(p.paidBy) ?? 0) + p.amount);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    const person: Person = {
      id: newId('people'),
      name,
      color: PERSON_COLORS.find((c) => !people.some((p) => p.color.toLowerCase() === c.toLowerCase())) ?? PERSON_COLORS[people.length % PERSON_COLORS.length],
      sortOrder: Math.max(0, ...people.map((p) => p.sortOrder)) + 1,
      active: true,
    };
    if (await run(() => personRepository.save(person), `${name} adicionado(a)`)) setNewName('');
  }

  return (
    <Section title="Quem paga">
      <p className="-mt-1 mb-3 text-[13px] text-ink-muted">Opções do campo “quem pagou”. Não é divisão de dívida, só organização.</p>
      <ul className="divide-y divide-sand/70 rounded-xl border border-sand">
        {people.map((p) => (
          <PersonRow key={p.id} person={p} total={paidBy.get(p.id) ?? 0} onRemove={() => setRemove(p)} />
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Avó da Bia, Padrinhos" aria-label="Nome da pessoa" />
        <Button type="submit" disabled={!newName.trim()}>
          <Plus size={14} aria-hidden /> Adicionar
        </Button>
      </form>
      <ConfirmDialog
        open={!!remove}
        title={remove && (paidBy.get(remove.id) ?? 0) > 0 ? `Desativar ${remove?.name}?` : `Excluir ${remove?.name}?`}
        confirmLabel={remove && (paidBy.get(remove.id) ?? 0) > 0 ? 'Desativar' : 'Excluir'}
        danger
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          const p = remove!;
          setRemove(null);
          await run(() => personRepository.removeOrDeactivate(p.id), 'Pronto');
        }}
      >
        {remove && (paidBy.get(remove.id) ?? 0) > 0
          ? `Há ${formatMoney(paidBy.get(remove.id)!)} em pagamentos registrados por ${remove.name}. O histórico continua, mas o nome deixa de aparecer como opção.`
          : 'Nenhum pagamento usa este nome.'}
      </ConfirmDialog>
    </Section>
  );
}

function PersonRow({ person, total, onRemove }: { person: Person; total: number; onRemove: () => void }) {
  const { run } = useMutate();
  const [name, setName] = useState(person.name);
  useEffect(() => setName(person.name), [person.name]);
  const save = () => {
    const n = name.trim();
    if (!n || n === person.name) return setName(person.name);
    run(() => personRepository.save({ ...person, name: n }), 'Nome atualizado');
  };
  return (
    <li className={`flex items-center gap-3 px-3 py-2 ${person.active ? '' : 'opacity-60'}`}>
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: person.color }} aria-hidden />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={`Nome de ${person.name}`}
        className="min-w-0 flex-1 rounded bg-transparent px-1.5 py-1 text-[14px] hover:bg-cream focus:bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <span className="num text-[12px] text-ink-muted">{total ? `pagou ${formatMoney(total)}` : ''}</span>
      {person.active ? (
        <button onClick={onRemove} aria-label={`Remover ${person.name}`} className="rounded p-1.5 text-ink-faint hover:bg-cream hover:text-danger">
          <Trash2 size={14} />
        </button>
      ) : (
        <button
          onClick={() => run(() => personRepository.save({ ...person, active: true }), `${person.name} reativado(a)`)}
          aria-label={`Reativar ${person.name}`}
          title="Reativar"
          className="rounded p-1.5 text-ink-faint hover:bg-cream hover:text-ink"
        >
          <Undo2 size={14} />
        </button>
      )}
    </li>
  );
}

function GitHubCard() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Section title="Dados no GitHub">
      <p className="text-[13.5px] text-ink-muted">
        Tudo o que vocês salvam aqui vira um commit no GitHub. O histórico mostra quem mudou o quê e quando, e qualquer alteração pode ser desfeita por lá.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {githubRepo && (
          <a
            href={`https://github.com/${githubRepo}/commits`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-[13px] font-semibold hover:bg-cream"
          >
            <History size={14} aria-hidden /> Ver histórico <ExternalLink size={12} aria-hidden />
          </a>
        )}
        <Button
          onClick={async () => {
            setBusy(true);
            await qc.refetchQueries({ queryKey: SNAPSHOT_KEY });
            setBusy(false);
          }}
          disabled={busy}
        >
          <RotateCcw size={14} aria-hidden /> {busy ? 'Recarregando…' : 'Recarregar dados'}
        </Button>
      </div>
    </Section>
  );
}

function DemoCard() {
  const { run } = useMutate();
  const [confirm, setConfirm] = useState(false);
  return (
    <Section title="Dados de exemplo">
      <p className="text-[13.5px] text-ink-muted">Enquanto testamos, as alterações ficam salvas só neste navegador. Para voltar ao estado inicial:</p>
      <Button className="mt-3" onClick={() => setConfirm(true)}>
        <RotateCcw size={14} aria-hidden /> Restaurar dados de exemplo
      </Button>
      <ConfirmDialog
        open={confirm}
        title="Restaurar dados de exemplo?"
        confirmLabel="Restaurar"
        danger
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          await run(resetDemoData, 'Dados de exemplo restaurados');
        }}
      >
        Tudo o que foi cadastrado ou editado neste navegador será apagado.
      </ConfirmDialog>
    </Section>
  );
}

function NumberRow({ label, unit, value, onChange, min, max }: { label: string; unit: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
      <span className="text-ink-soft">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num w-[72px] rounded-xl border border-sand bg-cream/60 px-2.5 py-1.5 text-right focus:border-accent focus:outline-none"
        />
        <span className="w-[150px] text-[12.5px] text-ink-muted">{unit}</span>
      </span>
    </label>
  );
}

function SaveRow({ dirty, disabled }: { dirty: boolean; disabled: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-1">
      {!dirty && (
        <span className="flex items-center gap-1 text-[12px] text-ink-faint">
          <Check size={12} aria-hidden /> salvo
        </span>
      )}
      <Button type="submit" variant="primary" size="sm" disabled={!dirty || disabled}>
        Salvar
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card h-fit px-5 py-4">
      <h2 className="label mb-3">{title}</h2>
      {children}
    </section>
  );
}
