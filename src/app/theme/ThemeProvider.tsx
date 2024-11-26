import StarWarsBG from 'assets/images/banner/star-wars-bg.webp';
import HalloweenBG from 'assets/images/banner/Ghosties-bg.webp';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark' | 'starwars' | 'halloween';

interface ThemeContextProps {
  currentTheme: Theme | undefined;
  checkoutTheme: 'light' | 'dark' | undefined;
  toggleTheme: (string: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  currentTheme: undefined,
  checkoutTheme: undefined,
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const root = document.getElementById('root');
  const [currentTheme, setCurrentTheme] = useState<Theme>();
  const [checkoutTheme, setCheckoutTheme] = useState<'light' | 'dark'>();

  const toggleTheme = (theme: Theme) => {
    setCurrentTheme(theme);
  };

  useEffect(() => {
    if (localStorage.getItem('theme')) {
      setCurrentTheme(localStorage.getItem('theme') as Theme);
      window.matchMedia('(prefers-color-scheme: dark)').matches ? setCheckoutTheme('dark') : setCheckoutTheme('light');
    } else {
      setCurrentTheme('system');
      window.matchMedia('(prefers-color-scheme: dark)').matches ? setCheckoutTheme('dark') : setCheckoutTheme('light');
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
        setCheckoutTheme('dark');
      } else if (currentTheme === 'starwars') {
        root.style.backgroundImage = `url(${StarWarsBG})`;
        document.documentElement.classList.add('dark');
        setCheckoutTheme('dark');
      } else if (currentTheme === 'halloween') {
        root.style.backgroundImage = `url(${HalloweenBG})`;
        document.documentElement.classList.add('dark');
        setCheckoutTheme('dark');
      } else {
        root.style.backgroundImage = 'none';
        document.documentElement.classList.remove('dark');
        setCheckoutTheme('light');
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
      checkoutTheme,
      toggleTheme,
    }),
    [currentTheme, checkoutTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={themeContextValue}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextProps => {
  return useContext(ThemeContext);
};
