import type { ReactNode } from 'react';

interface Props {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}

/** Moldura padrão de seção: título discreto, ação à direita, sem sombra */
export function Card({ title, subtitle, action, children, className = '', bodyClassName = 'px-6 pb-6', id }: Props) {
  return (
    <section id={id} className={`card ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-6 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</h2>}
            {subtitle && <div className="mt-1 text-[13px] text-ink-muted">{subtitle}</div>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
