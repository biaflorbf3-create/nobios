import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/** Pílula "Dark mode" com chave (como na referência) */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  if (compact)
    return (
      <button onClick={toggle} aria-label={dark ? 'Usar modo claro' : 'Usar modo escuro'} className="rounded-full p-2 text-ink-muted hover:bg-cream hover:text-ink">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  return (
    <button
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className={`flex w-full items-center justify-between rounded-full py-1.5 pl-4 pr-1.5 text-[13px] font-semibold transition-colors ${
        dark ? 'btn-grad text-white' : 'bg-cream text-ink-soft hover:text-ink'
      }`}
    >
      <span className="flex items-center gap-2">
        {dark ? <Moon size={15} aria-hidden /> : <Sun size={15} aria-hidden />} Dark mode
      </span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${dark ? 'bg-white/30' : 'bg-champagne'}`} aria-hidden>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
