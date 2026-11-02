import { useEffect, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { taskRepository } from '../../data/repositories';
import type { Snapshot, Task } from '../../domain/types';
import { todayISO } from '../../lib/dates';
import { newId } from '../../lib/ids';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button, DateInput, Field, Select, TextArea, TextInput } from '../../ui/form';
import { Sheet } from '../../ui/Sheet';

/** Criar ou editar tarefa: título, responsável, informações e prazo */
export function TaskForm({ open, onClose, snapshot, task }: { open: boolean; onClose: () => void; snapshot: Snapshot; task?: Task }) {
  const { run, pending } = useMutate();
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [done, setDone] = useState(false);
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const people = snapshot.people.filter((p) => p.active || p.id === task?.assigneeId).sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setTitle(task?.title ?? '');
    setAssigneeId(task?.assigneeId ?? '');
    setNotes(task?.notes ?? '');
    setDueDate(task?.dueDate ?? '');
    setDone(task?.done ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  const titleError = touched && !title.trim() ? 'Dê um título para a tarefa' : null;

  async function save() {
    setTouched(true);
    if (!title.trim()) return;
    const now = new Date().toISOString();
    const base = {
      title: title.trim(),
      assigneeId: assigneeId || null,
      notes: notes.trim() || undefined,
      dueDate: dueDate || null,
      done,
      doneAt: done ? (task?.done ? task.doneAt : todayISO()) : undefined,
    };
    const record: Task = task ? { ...task, ...base } : { id: newId('tasks'), ...base, createdAt: now, updatedAt: now };
    if (await run(() => taskRepository.save(record), task ? 'Tarefa atualizada' : 'Tarefa criada')) onClose();
  }

  return (
    <>
      <Sheet
        open={open && !deleting}
        onClose={onClose}
        width={480}
        title={task ? 'Editar tarefa' : 'Nova tarefa'}
        subtitle={task ? undefined : 'Ex.: Agendar degustação, Enviar convites'}
        footer={
          <>
            {task && (
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
          <Field label="Título" error={titleError}>
            {(id) => <TextInput id={id} data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" />}
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Responsável">
              {(id) => (
                <Select id={id} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Ninguém ainda</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Prazo" hint="Opcional">
              {(id) => <DateInput id={id} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
            </Field>
          </div>
          <Field label="Informações" hint="Detalhes, contatos, links, o que levar…">
            {(id) => <TextArea id={id} rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Escreva aqui o que for útil para essa tarefa" />}
          </Field>
          {task && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-cream/60 px-3.5 py-3 text-[14px] font-medium">
              <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent))]" />
              Tarefa concluída
            </label>
          )}
          <button type="submit" className="hidden" />
        </form>
      </Sheet>

      <ConfirmDialog
        open={open && deleting}
        title={`Excluir “${task?.title}”?`}
        confirmLabel="Excluir"
        danger
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          const ok = await run(() => taskRepository.remove(task!.id), 'Tarefa excluída');
          setDeleting(false);
          if (ok) onClose();
        }}
      >
        <p>Essa ação não pode ser desfeita.</p>
      </ConfirmDialog>
    </>
  );
}
