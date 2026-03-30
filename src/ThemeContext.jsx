import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext({ theme: 'dark', isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('disklens-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  useEffect(() => {
    localStorage.setItem('disklens-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
