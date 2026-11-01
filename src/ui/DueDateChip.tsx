import type { InstallmentStatus } from '../domain/finance';
import { formatChip } from '../lib/dates';

const STYLE: Record<InstallmentStatus, string> = {
  paid: 'bg-accent-soft text-accent',
  overdue: 'bg-danger/15 text-danger',
  partial: 'bg-warn/15 text-warn',
  'due-soon': 'bg-warn/15 text-warn',
  upcoming: 'bg-cream text-ink',
};

/** Bloco "05 NOV" com a cor do estado */
export function DueDateChip({ date, status }: { date: string; status: InstallmentStatus }) {
  const { day, month } = formatChip(date);
  return (
    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px] ${STYLE[status]}`}>
      <span className="num text-[17px] font-bold leading-none">{day}</span>
      <span className="mt-[3px] text-[9.5px] font-bold tracking-[0.06em] leading-none opacity-80">{month}</span>
    </div>
  );
}
