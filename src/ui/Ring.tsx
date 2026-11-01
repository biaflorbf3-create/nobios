import { useId } from 'react';
import { useTheme } from './ThemeProvider';

/**
 * Anel de % (como o "50%" da referência).
 * Arco externo em degradê = valor principal; arco interno opcional = valor secundário.
 */
export function Ring({
  value,
  inner,
  size = 168,
  stroke = 14,
  children,
  label,
}: {
  value: number;
  inner?: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  label: string;
}) {
  const { colors } = useTheme();
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const over = value > 1;
  const v = Math.max(0, Math.min(1, value));
  const ri = r - stroke - 4;
  const ci = 2 * Math.PI * ri;
  const vi = Math.max(0, Math.min(1, inner ?? 0));
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={over ? colors.danger : colors.gradFrom} />
            <stop offset="100%" stopColor={over ? colors.danger : colors.gradTo} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.champagne} strokeWidth={stroke} />
        {v > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
        />}
        {inner !== undefined && (
          <>
            <circle cx={size / 2} cy={size / 2} r={ri} fill="none" stroke={colors.cream} strokeWidth={6} />
            {vi > 0 && <circle cx={size / 2} cy={size / 2} r={ri} fill="none" stroke={colors.inkSoft} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${ci * vi} ${ci}`} />}
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
