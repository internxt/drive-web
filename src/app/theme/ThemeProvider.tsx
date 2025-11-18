import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import StarWarsBG from 'assets/images/banner/star-wars-bg.webp';
import StarWarsBG2 from 'assets/images/banner/internxt_SW_theme.webp';
import HalloweenBG from 'assets/images/banner/Ghosties-bg.webp';
import ChristmasBG from 'assets/images/banner/christmas_theme.webp';
import SuperBowlBG from 'assets/images/banner/superbowl_theme.webp';
import StPaticksBG from 'assets/images/banner/StPatrick-bg.png';
import IdManagementBG from 'assets/images/banner/IdManagement-bg.png';
import EnvironmentBG from 'assets/images/banner/environment_theme.png';
import SummerBG from 'assets/images/banner/SummerBanner.webp';
import AnniversaryBG from 'assets/images/banner/5th_anniversary_theme.avif';
import localStorageService from 'services/local-storage.service';

export type Theme =
  | 'system'
  | 'light'
  | 'dark'
  | 'starWars'
  | 'starWars2'
  | 'halloween'
  | 'christmas'
  | 'summer'
  | 'superBowl'
  | 'stPatricks'
  | 'idManagement'
  | 'environment'
  | 'anniversary';

interface ThemeContextProps {
  currentTheme: Theme | undefined;
  checkoutTheme: 'light' | 'dark' | undefined;
  toggleTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  currentTheme: undefined,
  checkoutTheme: undefined,
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

const THEME_CONFIG: Record<
  Exclude<Theme, 'system' | 'light' | 'dark'>,
  {
    background: string;
    darkMode: boolean;
    customStyle?: boolean;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
  }
> = {
  starWars: { background: StarWarsBG, darkMode: true },
  starWars2: { background: StarWarsBG2, darkMode: true, customStyle: true },
  halloween: { background: HalloweenBG, darkMode: true },
  christmas: { background: ChristmasBG, darkMode: true },
  stPatricks: { background: StPaticksBG, darkMode: true, customStyle: true },
  superBowl: { background: SuperBowlBG, darkMode: true, customStyle: true },
  idManagement: { background: IdManagementBG, darkMode: true, customStyle: true },
  environment: { background: EnvironmentBG, darkMode: true, customStyle: true },
  summer: { background: SummerBG, darkMode: true, customStyle: true },
  anniversary: { background: AnniversaryBG, darkMode: true, customStyle: true },
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const root = document.getElementById('root');
  const [currentTheme, setCurrentTheme] = useState<Theme>();
  const [checkoutTheme, setCheckoutTheme] = useState<'light' | 'dark'>();

  const toggleTheme = (theme: Theme) => setCurrentTheme(theme);

  const persistDarkTheme = (value: boolean) => {
    localStorageService.set('theme:isDark', value ? 'true' : 'false');
  };

  useEffect(() => {
    const stored = localStorageService.get('theme') as Theme | null;
    const defaultTheme = stored ?? 'system';
    setCurrentTheme(defaultTheme);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setCheckoutTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (!root || currentTheme === undefined) return;

    const updateTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      localStorageService.set('theme', currentTheme);

      if (currentTheme === 'dark' || (currentTheme === 'system' && prefersDark)) {
        root.style.backgroundImage = 'none';
        document.documentElement.classList.add('dark');
        setCheckoutTheme('dark');
        persistDarkTheme(true);
        return;
      }

      const config = THEME_CONFIG[currentTheme as keyof typeof THEME_CONFIG];

      if (config) {
        root.style.backgroundImage = `url(${config.background})`;

        if (config.customStyle) {
          root.style.backgroundSize = 'cover';
          root.style.backgroundPosition = 'center';
          root.style.backgroundRepeat = 'no-repeat';
        }
        if (config.darkMode) {
          document.documentElement.classList.add('dark');
          setCheckoutTheme('dark');
          persistDarkTheme(true);
          return;
        }

        document.documentElement.classList.remove('dark');
        setCheckoutTheme('light');
        persistDarkTheme(false);

        return;
      }

      // fallback to light theme
      root.style.backgroundImage = 'none';
      document.documentElement.classList.remove('dark');
      setCheckoutTheme('light');
      persistDarkTheme(false);
    };

    updateTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [currentTheme, root]);

  const themeContextValue = useMemo(
    () => ({
      currentTheme,
      checkoutTheme,
      toggleTheme,
    }),
    [currentTheme, checkoutTheme],
  );

  return <ThemeContext.Provider value={themeContextValue}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextProps => useContext(ThemeContext);
