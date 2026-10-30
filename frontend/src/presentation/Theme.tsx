import {createContext, useContext, useLayoutEffect, useState, type ReactNode} from 'react';
import {Moon, Sun} from 'lucide-react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'project-intelligence-theme';
const ThemeContext = createContext<{theme: Theme; toggle: () => void} | null>(null);
function initialTheme(): Theme {
  try {return sessionStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';}
  catch {return 'light';}
}
export function ThemeProvider({children}: {children: ReactNode}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Only a display preference is persisted, never project data or evidence.
    try {sessionStorage.setItem(STORAGE_KEY, theme);} catch { /* memory still works */ }
    return () => {delete document.documentElement.dataset.theme;};
  }, [theme]);
  return <ThemeContext.Provider value={{theme, toggle: () => setTheme(value => value === 'dark' ? 'light' : 'dark')}}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required.');
  const dark = context.theme === 'dark';
  return <button type="button" className="theme-toggle" role="switch" aria-checked={dark} aria-label="Dark mode" title={`Switch to ${dark ? 'light' : 'dark'} mode`} onClick={context.toggle}>
    <span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-thumb"/><Sun className="theme-sun" size={15}/><Moon className="theme-moon" size={14}/></span>
    <span className="theme-label">{dark ? 'Dark' : 'Light'}</span>
  </button>;
}
