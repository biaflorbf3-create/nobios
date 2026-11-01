/**
 * Marca Nobios: duas alianças entrelaçadas num quadrado arredondado em degradê roxo.
 * A aliança da frente passa por cima da outra em um ponto e por baixo no outro (entrelaçadas).
 */
export function LogoMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`btn-grad inline-flex shrink-0 items-center justify-center shadow-glow ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
      role="img"
      aria-label="Nobios"
    >
      <Rings width={size * 0.66} />
    </span>
  );
}

/** Só as alianças, na cor do texto (para usos pequenos, como o dia do casamento no calendário) */
export function Rings({ width = 28, color = '#FFFFFF', back = '#D9C9FF' }: { width?: number; color?: string; back?: string }) {
  // círculos de raio 8, centros em x=12 e x=22 (viewBox 34×22)
  return (
    <svg width={width} height={(width * 22) / 34} viewBox="0 0 34 22" aria-hidden>
      <circle cx="22" cy="11" r="8" fill="none" stroke={back} strokeWidth="2.4" />
      <circle cx="12" cy="11" r="8" fill="none" stroke={color} strokeWidth="2.4" />
      {/* trecho da aliança de trás passando por cima na interseção de baixo: entrelaçamento */}
      <path d="M 15.87 16.14 A 8 8 0 0 0 19.0 18.42" fill="none" stroke={back} strokeWidth="2.4" />
    </svg>
  );
}

/** Logo completo: marca + "Nobios" + "Bia e Vini" */
export function Logo({ size = 44, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={size} />
      <span className="leading-tight">
        <span className={`block font-bold tracking-[-0.03em] text-ink ${compact ? 'text-[19px]' : 'text-[22px]'}`}>Nobios</span>
        <span className={`block font-medium text-ink-muted ${compact ? 'text-[11px]' : 'text-[12px]'}`}>Bia e Vini</span>
      </span>
    </span>
  );
}
