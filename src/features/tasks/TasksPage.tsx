import { CalendarClock, Check, ChevronRight, FileText, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { useFinance } from '../../data/hooks/useSnapshot';
import { taskRepository } from '../../data/repositories';
import type { Person, Task } from '../../domain/types';
import { daysBetween, formatShort, todayISO } from '../../lib/dates';
import { Button } from '../../ui/form';
import { TaskForm } from './TaskForm';

type Filter = 'open' | 'done' | 'all';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'A fazer' },
  { id: 'done', label: 'Concluídas' },
  { id: 'all', label: 'Todas' },
];

type Group = 'overdue' | 'soon' | 'later' | 'nodate' | 'done';
const GROUP_LABEL: Record<Group, string> = {
  overdue: 'Atrasadas',
  soon: 'Próximos dias',
  later: 'Mais adiante',
  nodate: 'Sem prazo',
  done: 'Concluídas',
};
const GROUP_ORDER: Group[] = ['overdue', 'soon', 'later', 'nodate', 'done'];

export function TasksPage() {
  const data = useFinance();
  const { run } = useMutate();
  const [filter, setFilter] = useState<Filter>('open');
  const [who, setWho] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Task | 'new' | null>(null);

  const today = todayISO();
  const soonDays = data?.snapshot.wedding.dueSoonDays ?? 7;

  const groups = useMemo(() => {
    if (!data) return [];
    const q = normalize(query);
    const list = data.snapshot.tasks
      .filter((t) => (filter === 'open' ? !t.done : filter === 'done' ? t.done : true))
      .filter((t) => !who || (who === 'none' ? !t.assigneeId : t.assigneeId === who))
      .filter((t) => !q || normalize(`${t.title} ${t.notes ?? ''}`).includes(q));
    const by = new Map<Group, Task[]>();
    for (const t of list) {
      const g = groupOf(t, today, soonDays);
      by.set(g, [...(by.get(g) ?? []), t]);
    }
    for (const [g, ts] of by)
      ts.sort((a, b) =>
        g === 'done'
          ? (b.doneAt ?? '').localeCompare(a.doneAt ?? '')
          : (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.createdAt.localeCompare(b.createdAt),
      );
    return GROUP_ORDER.filter((g) => by.has(g)).map((g) => ({ group: g, tasks: by.get(g)! }));
  }, [data, filter, who, query, today, soonDays]);

  if (!data) return null;
  const { snapshot } = data;
  const people = new Map(snapshot.people.map((p) => [p.id, p]));
  const open = snapshot.tasks.filter((t) => !t.done);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
  const doneCount = snapshot.tasks.length - open.length;
  const counts: Record<Filter, number> = { open: open.length, done: doneCount, all: snapshot.tasks.length };
  const assignees = snapshot.people.filter((p) => snapshot.tasks.some((t) => t.assigneeId === p.id)).sort((a, b) => a.sortOrder - b.sortOrder);
  const pct = snapshot.tasks.length ? Math.round((doneCount / snapshot.tasks.length) * 100) : 0;

  const toggle = (t: Task) =>
    run(
      () => taskRepository.save({ ...t, done: !t.done, doneAt: t.done ? undefined : today }),
      t.done ? 'Tarefa reaberta' : 'Tarefa concluída',
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Tarefas</h1>
          <p className="mt-2.5 text-[14px] text-ink-muted">
            <span className="num font-medium text-ink">{open.length}</span> a fazer
            {overdue > 0 && (
              <>
                {' · '}
                <span className="num font-medium text-danger">{overdue}</span> atrasada{overdue > 1 ? 's' : ''}
              </>
            )}
            {' · '}
            <span className="num font-medium text-ink">{doneCount}</span> concluída{doneCount === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing('new')} className="self-start sm:self-auto">
          <Plus size={15} strokeWidth={2} aria-hidden /> Tarefa
        </Button>
      </header>

      {snapshot.tasks.length > 0 && (
        <div className="card flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-semibold">Progresso</span>
              <span className="num text-ink-muted">
                {doneCount} de {snapshot.tasks.length} · {pct}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream">
              <div className="btn-grad h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Filtrar tarefas" className="flex self-start overflow-x-auto glass rounded-full p-1 shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
                filter === f.id ? 'bg-accent text-white' : 'text-ink-muted hover:bg-cream hover:text-ink'
              }`}
            >
              {f.label}
              <span className={`num text-[11px] ${filter === f.id ? 'text-white/75' : 'text-ink-faint'}`}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarefa"
            aria-label="Buscar tarefa"
            className="w-full glass rounded-full py-2.5 pl-10 pr-4 shadow-card text-[13.5px] placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {assignees.length > 0 && (
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filtrar por responsável">
          <Chip active={who === ''} onClick={() => setWho('')}>
            Todos
          </Chip>
          {assignees.map((p) => (
            <Chip key={p.id} active={who === p.id} onClick={() => setWho(who === p.id ? '' : p.id)}>
              <Dot person={p} /> {p.name}
            </Chip>
          ))}
          {snapshot.tasks.some((t) => !t.assigneeId) && (
            <Chip active={who === 'none'} onClick={() => setWho(who === 'none' ? '' : 'none')}>
              Sem responsável
            </Chip>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="text-[14px] text-ink-muted">
            {snapshot.tasks.length === 0 ? 'Nenhuma tarefa ainda. Que tal começar pela primeira?' : filter === 'open' && !query && !who ? 'Tudo feito por aqui! 🎉' : 'Nenhuma tarefa encontrada.'}
          </p>
          <Button className="mt-4" onClick={() => setEditing('new')}>
            <Plus size={14} aria-hidden /> Nova tarefa
          </Button>
        </div>
      ) : (
        groups.map(({ group, tasks }) => (
          <section key={group} className="space-y-2">
            <h2 className={`flex items-center gap-2 px-1 text-[13px] font-semibold ${group === 'overdue' ? 'text-danger' : 'text-ink-muted'}`}>
              {GROUP_LABEL[group]}
              <span className="num text-[11.5px] font-medium opacity-70">{tasks.length}</span>
            </h2>
            <ul className="card divide-y divide-sand/70 overflow-hidden">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} person={t.assigneeId ? people.get(t.assigneeId) : undefined} today={today} soonDays={soonDays} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />
              ))}
            </ul>
          </section>
        ))
      )}

      <TaskForm open={editing !== null} onClose={() => setEditing(null)} snapshot={snapshot} task={editing && editing !== 'new' ? editing : undefined} />
    </div>
  );
}

function TaskRow({ task, person, today, soonDays, onToggle, onOpen }: { task: Task; person?: Person; today: string; soonDays: number; onToggle: () => void; onOpen: () => void }) {
  const days = task.dueDate ? daysBetween(today, task.dueDate) : null;
  const dueTone = task.done || days === null ? 'text-ink-muted' : days < 0 ? 'text-danger' : days <= soonDays ? 'text-warn' : 'text-ink-muted';
  const dueText =
    days === null ? null : task.done ? formatShort(task.dueDate!) : days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : days < 0 ? `${formatShort(task.dueDate!)} · ${-days} dia${days === -1 ? '' : 's'} atrás` : days <= soonDays ? `${formatShort(task.dueDate!)} · em ${days} dias` : formatShort(task.dueDate!);
  return (
    <li className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Reabrir “${task.title}”` : `Concluir “${task.title}”`}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.done ? 'border-accent bg-accent text-white' : 'border-ink-faint/70 hover:border-accent hover:bg-accent-soft'
        }`}
      >
        {task.done && <Check size={14} strokeWidth={3} aria-hidden />}
      </button>
      <button onClick={onOpen} className="group flex min-w-0 flex-1 items-start gap-2 text-left">
        <div className="min-w-0 flex-1">
          <div className={`text-[14.5px] font-semibold leading-snug ${task.done ? 'text-ink-muted line-through decoration-ink-faint' : ''}`}>{task.title}</div>
          {task.notes && (
            <p className="mt-1 flex gap-1.5 text-[12.5px] leading-[1.45] text-ink-muted">
              <FileText size={13} className="mt-[2px] shrink-0 text-ink-faint" aria-hidden />
              <span className="line-clamp-2 whitespace-pre-line">{task.notes}</span>
            </p>
          )}
          {(person || dueText) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              {person && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2 py-[3px] font-medium text-ink-soft">
                  <Dot person={person} /> {person.name}
                </span>
              )}
              {dueText && (
                <span className={`num inline-flex items-center gap-1 font-medium ${dueTone}`}>
                  <CalendarClock size={13} aria-hidden /> {dueText}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint group-hover:text-ink" aria-hidden />
      </button>
    </li>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
        active ? 'border-accent bg-accent-soft text-accent' : 'border-sand bg-surface/70 text-ink-soft hover:border-accent/50'
      }`}
    >
      {children}
    </button>
  );
}

function Dot({ person }: { person: Person }) {
  return <span className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/25" style={{ background: person.color }} aria-hidden />;
}

function groupOf(t: Task, today: string, soonDays: number): Group {
  if (t.done) return 'done';
  if (!t.dueDate) return 'nodate';
  const d = daysBetween(today, t.dueDate);
  return d < 0 ? 'overdue' : d <= soonDays ? 'soon' : 'later';
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
