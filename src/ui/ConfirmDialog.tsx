import { useEffect, type ReactNode } from 'react';
import { Button } from './form';

/** Confirmação dentro da página (a hospedagem bloqueia o confirm() do navegador) */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-[420px] rounded-[24px] bg-surface p-6 shadow-hover dark:ring-1 dark:ring-sand">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {children && <div className="mt-2 text-[13.5px] leading-5 text-ink-muted">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
