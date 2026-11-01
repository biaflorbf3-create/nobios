import { CalendarRange } from 'lucide-react';
import { PERIOD_LABELS, type PeriodPreset } from '../lib/period';

const PRESETS: PeriodPreset[] = ['month', '3m', '6m', 'wedding', 'custom'];
const SHORT: Record<PeriodPreset, string> = {
  month: 'Este mês',
  '3m': '3 meses',
  '6m': '6 meses',
  wedding: 'Até o casamento',
  custom: 'Personalizado',
};

interface Props {
  value: PeriodPreset;
  onChange: (p: PeriodPreset) => void;
  custom: { from: string; to: string };
  onCustomChange: (c: { from: string; to: string }) => void;
}

export function PeriodFilter({ value, onChange, custom, onCustomChange }: Props) {
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Período" className="flex max-w-full overflow-x-auto glass rounded-full p-1 shadow-card">
        {PRESETS.map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={value === p}
            title={PERIOD_LABELS[p]}
            onClick={() => onChange(p)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              value === p ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {SHORT[p]}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-[12.5px] shadow-card">
          <CalendarRange size={14} className="text-ink-muted" aria-hidden />
          <input
            type="date"
            aria-label="Data inicial"
            value={custom.from}
            onChange={(e) => e.target.value && onCustomChange({ ...custom, from: e.target.value })}
            className="num bg-transparent outline-none"
          />
          <span className="text-ink-faint">até</span>
          <input
            type="date"
            aria-label="Data final"
            value={custom.to}
            min={custom.from}
            onChange={(e) => e.target.value && onCustomChange({ ...custom, to: e.target.value })}
            className="num bg-transparent outline-none"
          />
        </div>
      )}
    </div>
  );
}
