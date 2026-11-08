import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from './restrictToVerticalAxis';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutate } from '../../data/hooks/useMutate';
import { weddingRepository } from '../../data/repositories';
import type { Wedding } from '../../domain/types';
import { Button } from '../../ui/form';
import { Sheet } from '../../ui/Sheet';
import { blockDef, DEFAULT_ORDER, normalizeOrder, sameOrder, type BlockId } from './blocks';

/** Reordenar os blocos do painel: arrastar pela alça ou usar as setas. Salva no GitHub ao concluir. */
export function OrganizeSheet({ open, onClose, wedding }: { open: boolean; onClose: () => void; wedding: Wedding }) {
  const { run, pending } = useMutate();
  const saved = normalizeOrder(wedding.dashboardOrder);
  const [order, setOrder] = useState<BlockId[]>(saved);

  useEffect(() => {
    if (open) setOrder(normalizeOrder(wedding.dashboardOrder));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => setOrder((o) => (to < 0 || to >= o.length ? o : arrayMove(o, from, to)));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) setOrder((o) => arrayMove(o, o.indexOf(active.id as BlockId), o.indexOf(over.id as BlockId)));
  };

  async function save() {
    if (sameOrder(order, saved)) return onClose();
    const isDefault = sameOrder(order, DEFAULT_ORDER);
    const next: Wedding = { ...wedding, dashboardOrder: isDefault ? undefined : order };
    if (await run(() => weddingRepository.save(next), 'Ordem do painel salva')) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={460}
      title="Organizar painel"
      subtitle="Arraste pela alça ou use as setas. Vale para vocês dois."
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => setOrder(DEFAULT_ORDER)} disabled={sameOrder(order, DEFAULT_ORDER)}>
            <RotateCcw size={14} aria-hidden /> Padrão
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} disabled={pending}>
            Salvar ordem
          </Button>
        </>
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {order.map((id, i) => (
              <Item key={id} id={id} index={i} last={i === order.length - 1} onMove={move} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p className="mt-4 text-[12px] leading-5 text-ink-muted">
        No computador, dois blocos menores seguidos dividem a mesma linha; blocos grandes (Categorias, Orçado × contratado) ocupam a linha toda.
      </p>
    </Sheet>
  );
}

function Item({ id, index, last, onMove }: { id: BlockId; index: number; last: boolean; onMove: (from: number, to: number) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const def = blockDef(id);
  const Icon = def.icon;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-3 rounded-[18px] border bg-surface px-2 py-2.5 ${isDragging ? 'z-10 border-accent shadow-hover' : 'border-sand'}`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${def.label}`}
        className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-ink-faint hover:bg-cream hover:text-ink active:cursor-grabbing"
      >
        <GripVertical size={18} aria-hidden />
      </button>
      <span className="icon-tile h-9 w-9 shrink-0 rounded-[12px]">
        <Icon size={16} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{def.label}</span>
        <span className="block truncate text-[12px] text-ink-muted">{def.hint}</span>
      </span>
      <span className="flex shrink-0 gap-1 pr-1">
        <IconBtn label={`Subir ${def.label}`} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
          <ArrowUp size={16} aria-hidden />
        </IconBtn>
        <IconBtn label={`Descer ${def.label}`} disabled={last} onClick={() => onMove(index, index + 1)}>
          <ArrowDown size={16} aria-hidden />
        </IconBtn>
      </span>
    </li>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} disabled={disabled} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-ink-soft hover:text-accent disabled:opacity-35">
      {children}
    </button>
  );
}
