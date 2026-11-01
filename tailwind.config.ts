import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        surface: v('surface'),
        cream: v('cream'),
        champagne: v('champagne'),
        sand: v('sand'),
        ink: { DEFAULT: v('ink'), soft: v('ink-soft'), muted: v('ink-muted'), faint: v('ink-faint') },
        accent: { DEFAULT: v('accent'), strong: v('accent-strong'), soft: v('accent-soft') },
        ok: v('ok'),
        warn: v('warn'),
        danger: v('danger'),
        info: v('info'),
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        label: ['11px', { lineHeight: '14px', letterSpacing: '0.04em' }],
      },
      borderRadius: { card: '24px', tile: '18px' },
      boxShadow: {
        card: '0 1px 2px rgb(16 28 22 / 0.04), 0 8px 28px rgb(16 28 22 / 0.06)',
        hover: '0 2px 4px rgb(16 28 22 / 0.06), 0 16px 40px rgb(16 28 22 / 0.10)',
        glow: '0 8px 24px rgb(var(--accent) / 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
