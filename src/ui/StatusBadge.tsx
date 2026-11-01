import { AlertCircle, Check, Circle, Clock, Heart, Minus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'gold';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  neutral: 'bg-cream text-ink-muted',
  gold: 'bg-accent-soft text-accent',
};

export const TONE_ICON: Record<Tone, LucideIcon> = {
  ok: Check,
  warn: Clock,
  danger: AlertCircle,
  info: Circle,
  neutral: Minus,
  gold: Heart,
};

/** Selo em pílula: fundo da cor a 12%, texto na cor cheia, sempre com ícone (nunca só cor) */
export function StatusBadge({ tone, children, icon = true }: { tone: Tone; children: ReactNode; icon?: boolean | LucideIcon }) {
  const Icon = typeof icon === 'function' || typeof icon === 'object' ? icon : TONE_ICON[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold leading-none ${TONE_CLASS[tone]}`}>
      {icon !== false && <Icon size={11} strokeWidth={2.5} aria-hidden />}
      {children}
    </span>
  );
}
