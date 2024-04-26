import StarWarsBG from 'assets/images/banner/star-wars-bg.webp';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark' | 'starwars';

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
  const root = document.getElementById('root');
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
    if (!root) return;

    const updateTheme = () => {
      if (
        currentTheme === 'dark' ||
        (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        root.style.backgroundImage = 'none';
        document.documentElement.classList.add('dark');
      } else if (currentTheme === 'starwars') {
        root.style.backgroundImage = `url(${StarWarsBG})`;
        document.documentElement.classList.add('dark');
      } else {
        root.style.backgroundImage = 'none';
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
