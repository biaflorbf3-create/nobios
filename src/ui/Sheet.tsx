import { X } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/** Painel lateral no desktop, folha de baixo no celular. Esc fecha. */
export function Sheet({ open, onClose, title, subtitle, children, footer, width = 520 }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea');
      first?.focus();
    }, 30);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        style={{ '--w': `${width}px` } as CSSProperties}
        className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-[28px] bg-surface shadow-hover sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[min(var(--w),calc(100vw-24px))] sm:rounded-[28px] dark:ring-1 dark:ring-sand"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-sand sm:hidden" aria-hidden />
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-7 sm:pt-6">
          <div className="min-w-0">
            <h2 className="text-[20px] font-bold tracking-[-0.01em] leading-tight">{title}</h2>
            {subtitle && <div className="mt-1 text-[13px] text-ink-muted">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="-mr-1 rounded-full bg-cream p-2 text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">{children}</div>
        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-sand px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-7">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
