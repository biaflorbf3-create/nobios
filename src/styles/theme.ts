/**
 * Tokens de cor do Bia & Vini, em claro e escuro.
 * As telas usam classes Tailwind (bg-surface, text-ink, text-accent…) que apontam para variáveis CSS;
 * gráficos SVG leem os mesmos valores via useTheme().colors.
 */
export type ThemeName = 'light' | 'dark';

export interface Palette {
  paper: string; // fundo do app
  surface: string; // cards
  cream: string; // superfície sutil (hover, linhas, chips)
  champagne: string; // trilho de barras e anéis
  sand: string; // bordas
  ink: string;
  inkSoft: string;
  inkMuted: string;
  inkFaint: string;
  accent: string; // violeta
  accentStrong: string;
  accentSoft: string;
  ok: string;
  warn: string;
  danger: string;
  info: string;
  /** degradê dos botões primários e áreas */
  gradFrom: string;
  gradTo: string;
  /** brilhos do fundo (degradê roxo) */
  glowA: string;
  glowB: string;
  glowC: string;
}

export const THEMES: Record<ThemeName, Palette> = {
  light: {
    paper: '#EEE7FA',
    surface: '#FFFFFF',
    cream: '#F2EEF9',
    champagne: '#E6E0F2',
    sand: '#E8E2F3',
    ink: '#17141F',
    inkSoft: '#3D3749',
    inkMuted: '#6E6880',
    inkFaint: '#A19BB2',
    accent: '#7C3AED',
    accentStrong: '#6D28D9',
    accentSoft: '#EDE5FE',
    ok: '#7C3AED',
    warn: '#C9820A',
    danger: '#DC4A46',
    info: '#5B6B8C',
    gradFrom: '#9B6BFF',
    gradTo: '#5B21B6',
    glowA: '#9F7AEA',
    glowB: '#C4A1F7',
    glowC: '#D9C6FB',
  },
  dark: {
    paper: '#0C0912',
    surface: '#1B1527',
    cream: '#251D35',
    champagne: '#30263F',
    sand: '#31284A',
    ink: '#F4F1FA',
    inkSoft: '#D2CBE0',
    inkMuted: '#988FAD',
    inkFaint: '#665D7A',
    accent: '#A78BFA',
    accentStrong: '#C4B5FD',
    accentSoft: '#2E2150',
    ok: '#A78BFA',
    warn: '#EDB246',
    danger: '#F06A62',
    info: '#94A3C7',
    gradFrom: '#A374FF',
    gradTo: '#5B21B6',
    glowA: '#7C3AED',
    glowB: '#A855F7',
    glowC: '#3B0F6E',
  },
};

const VAR: Record<keyof Palette, string> = {
  paper: '--paper',
  surface: '--surface',
  cream: '--cream',
  champagne: '--champagne',
  sand: '--sand',
  ink: '--ink',
  inkSoft: '--ink-soft',
  inkMuted: '--ink-muted',
  inkFaint: '--ink-faint',
  accent: '--accent',
  accentStrong: '--accent-strong',
  accentSoft: '--accent-soft',
  ok: '--ok',
  warn: '--warn',
  danger: '--danger',
  info: '--info',
  gradFrom: '--grad-from',
  gradTo: '--grad-to',
  glowA: '--glow-a',
  glowB: '--glow-b',
  glowC: '--glow-c',
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** Escreve as variáveis no <html> e marca a classe do tema */
export function applyTheme(name: ThemeName) {
  const root = document.documentElement;
  const p = THEMES[name];
  for (const k of Object.keys(VAR) as (keyof Palette)[]) root.style.setProperty(VAR[k], rgb(p[k]));
  root.classList.toggle('dark', name === 'dark');
  root.style.colorScheme = name;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.paper);
}

const KEY = 'bia-vini:theme';
export function readTheme(): ThemeName {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
export function saveTheme(name: ThemeName) {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}
