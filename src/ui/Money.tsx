import type { Cents } from '../domain/types';
import { formatMoney } from '../lib/money';

const SIZES = {
  sm: 'text-[13px]',
  md: 'text-[15px] font-medium',
  lg: 'text-[20px] font-semibold tracking-[-0.01em]',
  xl: 'text-[26px] font-semibold tracking-[-0.02em]',
} as const;

const TONES = {
  default: 'text-ink',
  muted: 'text-ink-muted',
  ok: 'text-ok',
  danger: 'text-danger',
  warn: 'text-warn',
} as const;

interface Props {
  cents: Cents;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  /** mostra + / − na frente */
  signed?: boolean;
  className?: string;
}

/** Valor monetário com algarismos tabulares; o "R$" fica menor para o número dominar */
export function Money({ cents, size = 'md', tone = 'default', signed = false, className = '' }: Props) {
  const negative = cents < 0;
  const text = formatMoney(Math.abs(cents));
  const [, rest] = text.split('R$ ');
  const sign = signed ? (negative ? '− ' : cents > 0 ? '+ ' : '') : negative ? '− ' : '';
  const big = size === 'lg' || size === 'xl';
  return (
    <span className={`num whitespace-nowrap ${SIZES[size]} ${TONES[tone]} ${className}`}>
      {sign}
      <span className={big ? 'mr-[3px] text-[0.6em] font-medium text-ink-muted align-[0.18em]' : 'mr-[2px]'}>R$</span>
      {rest}
    </span>
  );
}
