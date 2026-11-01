import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { applyTheme, readTheme, saveTheme, THEMES, type Palette, type ThemeName } from '../styles/theme';

interface Ctx {
  theme: ThemeName;
  colors: Palette;
  toggle: () => void;
}

const ThemeCtx = createContext<Ctx>({ theme: 'light', colors: THEMES.light, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(readTheme);
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <ThemeCtx.Provider value={{ theme, colors: THEMES[theme], toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
