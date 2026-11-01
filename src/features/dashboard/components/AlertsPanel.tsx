import { AlertCircle, CheckCircle2, ChevronRight, Clock, Info } from 'lucide-react';
import { useState } from 'react';
import type { Alert, AlertLevel } from '../../../domain/finance';
import { Money } from '../../../ui/Money';

const LEVEL = {
  critical: { icon: AlertCircle, tile: 'bg-danger/15 text-danger' },
  warning: { icon: Clock, tile: 'bg-warn/15 text-warn' },
  info: { icon: Info, tile: 'bg-info/15 text-info' },
} satisfies Record<AlertLevel, unknown>;

const LIMIT = 4;

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? alerts : alerts.slice(0, LIMIT);
  return (
    <section className="card flex h-full flex-col p-6" aria-label="Alertas">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold tracking-[-0.01em]">Alertas</h2>
        {alerts.length > 0 && <span className="num rounded-full bg-cream px-2.5 py-1 text-[11.5px] font-bold text-ink-soft">{alerts.length}</span>}
      </div>
      {alerts.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-[13.5px] font-medium text-ok">
          <CheckCircle2 size={16} aria-hidden /> Tudo em dia.
        </p>
      ) : (
        <ul className="mt-3 flex-1 space-y-1">
          {shown.map((a) => {
            const { icon: Icon, tile } = LEVEL[a.level];
            return (
              <li key={a.id}>
                <a href={a.href} className="group flex items-center gap-3 rounded-[16px] p-2 hover:bg-cream/60">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${tile}`}>
                    <Icon size={16} strokeWidth={2} aria-label={a.level} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold leading-5">{a.title}</div>
                    {a.detail && <div className="truncate text-[12px] text-ink-muted">{a.detail}</div>}
                  </div>
                  {a.amount !== undefined && <Money cents={a.amount} size="sm" className="font-semibold text-ink-soft" />}
                  <ChevronRight size={15} className="text-ink-faint group-hover:text-ink" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {alerts.length > LIMIT && (
        <button onClick={() => setAll((x) => !x)} className="mt-2 self-start px-2 text-[12.5px] font-semibold text-accent hover:underline underline-offset-4">
          {all ? 'Mostrar menos' : `Ver mais ${alerts.length - LIMIT}`}
        </button>
      )}
    </section>
  );
}
