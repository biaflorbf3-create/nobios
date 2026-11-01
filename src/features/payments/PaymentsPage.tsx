import { CalendarDays, List } from 'lucide-react';
import { useState } from 'react';
import { useFinance } from '../../data/hooks/useSnapshot';
import { CalendarView } from './CalendarView';
import { PaymentsList } from './PaymentsList';

type View = 'list' | 'calendar';
const KEY = 'bia-vini:payments-view';

function readView(): View {
  try {
    return localStorage.getItem(KEY) === 'calendar' ? 'calendar' : 'list';
  } catch {
    return 'list';
  }
}

export function PaymentsPage() {
  const data = useFinance();
  const [view, setView] = useState<View>(readView);
  if (!data) return null;
  const { finance } = data;
  const open = finance.installments.filter((v) => v.contract.status === 'active' && v.remaining > 0);
  const overdue = open.filter((v) => v.status === 'overdue');

  const change = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ok */
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Pagamentos</h1>
          <p className="mt-2.5 text-[14px] text-ink-muted">
            <span className="num font-medium text-ink">{open.length}</span> parcelas em aberto
            {overdue.length > 0 && (
              <>
                {' '}· <span className="num font-medium text-danger">{overdue.length}</span> <span className="text-danger">vencidas</span>
              </>
            )}
          </p>
        </div>
        <div role="tablist" aria-label="Visualização" className="flex self-start glass rounded-full p-1 shadow-card sm:self-auto">
          {(
            [
              ['list', 'Lista', List],
              ['calendar', 'Calendário', CalendarDays],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => change(id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${view === id ? 'bg-accent text-white' : 'text-ink-muted hover:bg-cream hover:text-ink'}`}
            >
              <Icon size={14} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </header>
      {view === 'list' ? <PaymentsList snapshot={data.snapshot} finance={finance} /> : <CalendarView snapshot={data.snapshot} finance={finance} />}
    </div>
  );
}
