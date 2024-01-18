import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';

interface ThemeContextProps {
  currentTheme: Theme | undefined;
  toggleTheme: (string) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  currentTheme: undefined,
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>();

  const toggleTheme = (theme: Theme) => {
    setCurrentTheme(theme);
  };

  useEffect(() => {
    if (localStorage.getItem('theme')) {
      setCurrentTheme(localStorage.getItem('theme') as Theme);
    } else {
      setCurrentTheme('system');
    }
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      if (
        currentTheme === 'dark' ||
        (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (currentTheme !== undefined) {
      localStorage.setItem('theme', currentTheme);
      updateTheme();
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);

    return () => {
      window.removeEventListener('change', updateTheme);
    };
  }, [currentTheme]);

  const themeContextValue = useMemo(
    () => ({
      currentTheme,
      toggleTheme,
    }),
    [currentTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={themeContextValue}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextProps => {
  return useContext(ThemeContext);
};
