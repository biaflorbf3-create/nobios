import { FilePlus2, HandCoins, ListChecks, Plus, ReceiptText, Store, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFinance } from '../../data/hooks/useSnapshot';
import { QuoteForm } from '../../features/budget/QuoteForm';
import { ContractForm } from '../../features/contracts/ContractForm';
import { QuickExpenseSheet } from '../../features/expenses/QuickExpenseSheet';
import { useRegisterPayment } from '../../features/payments/PaymentContext';
import { SupplierForm } from '../../features/suppliers/SupplierForm';
import { TaskForm } from '../../features/tasks/TaskForm';
import { href, navigate, parseHash } from '../router';

type Action = 'payment' | 'supplier' | 'quote' | 'expense' | 'task';

const ITEMS: { id: Action; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'payment', label: 'Registrar pagamento', hint: 'de uma parcela', icon: HandCoins },
  { id: 'expense', label: 'Despesa rápida', hint: 'compra à vista', icon: ReceiptText },
  { id: 'quote', label: 'Nova proposta', hint: 'para comparar', icon: FilePlus2 },
  { id: 'supplier', label: 'Novo fornecedor', hint: '', icon: Store },
  { id: 'task', label: 'Nova tarefa', hint: '', icon: ListChecks },
];

/** Botão global "+ Novo": as ações frequentes a 2 cliques de qualquer tela */
export function NewMenu({ variant = 'button' }: { variant?: 'button' | 'fab' | 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const data = useFinance();
  const register = useRegisterPayment();
  const [action, setAction] = useState<Action | null>(null);
  const [contractFor, setContractFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  // na página de uma categoria, a nova proposta já vem nela
  const route = parseHash(window.location.hash);
  const currentCategory = route.name === 'categoria' ? route.id : undefined;

  return (
    <div ref={ref} className="relative">
      {variant !== 'fab' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`btn-grad flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-glow hover:brightness-105 ${variant === 'sidebar' ? 'w-full justify-center py-3' : ''}`}
        >
          <Plus size={15} strokeWidth={2} aria-hidden /> Novo
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Novo"
          className="btn-grad flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow ring-4 ring-surface/80"
        >
          <Plus size={22} strokeWidth={2.2} aria-hidden />
        </button>
      )}
      {open && (
        <div
          role="menu"
          className={`absolute z-40 w-64 rounded-[20px] bg-surface p-2 shadow-hover ring-1 ring-sand ${
            variant === 'button' ? 'right-0 top-11' : variant === 'sidebar' ? 'left-0 top-12' : 'bottom-16 right-0'
          }`}
        >
          {ITEMS.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (id === 'payment') register(null);
                else setAction(id);
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-[13.5px] font-medium hover:bg-cream"
            >
              <span className="icon-tile h-8 w-8 rounded-[10px]"><Icon size={15} strokeWidth={1.8} aria-hidden /></span>
              <span className="flex-1">{label}</span>
              <span className="text-[11px] text-ink-faint">{hint}</span>
            </button>
          ))}
        </div>
      )}
      {data && (
        <>
          <SupplierForm
            open={action === 'supplier'}
            onClose={() => setAction(null)}
            snapshot={data.snapshot}
            onSaved={(id, andContract) => (andContract ? setContractFor(id) : navigate(href.supplier(id)))}
          />
          <QuoteForm open={action === 'quote'} onClose={() => setAction(null)} snapshot={data.snapshot} categoryId={currentCategory} />
          <TaskForm open={action === 'task'} onClose={() => setAction(null)} snapshot={data.snapshot} />
          <QuickExpenseSheet open={action === 'expense'} onClose={() => setAction(null)} snapshot={data.snapshot} />
          {contractFor && (
            <ContractForm
              open
              snapshot={data.snapshot}
              supplierId={contractFor}
              onClose={() => {
                const id = contractFor;
                setContractFor(null);
                navigate(href.supplier(id));
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
