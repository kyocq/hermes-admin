import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {}, set: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('hermes-theme') as Theme) || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('hermes-theme', theme);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark'), set: setTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
