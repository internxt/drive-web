import localStorageService from 'services/local-storage.service';
import { STORAGE_KEYS } from 'services/storage-keys';
import { Theme } from './ThemeProvider';

interface ThemeDefinition {
  key: string;
  promoCodes: string[];
}

export const THEME_DEFINITIONS: Record<Exclude<Theme, 'light' | 'dark' | 'system'>, ThemeDefinition> = {
  starWars: {
    key: STORAGE_KEYS.THEMES.STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['STARWARS85', 'SPECIALX80'],
  },
  starWars2: {
    key: STORAGE_KEYS.THEMES.STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['STARWARS85', 'SPECIALX80'],
  },
  halloween: {
    key: STORAGE_KEYS.THEMES.HALLOWEEN_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['HORROR80'],
  },
  christmas: {
    key: STORAGE_KEYS.THEMES.CHRISTMAS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['SECRETSANTA80'],
  },
  superBowl: {
    key: STORAGE_KEYS.THEMES.SUPERBOWL_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['SUPERBOWL80', 'SPECIALX80', 'REDDIT80', 'IGSPECIAL80'],
  },
  stPatricks: {
    key: STORAGE_KEYS.THEMES.STPATRICKS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['STPADDYS80'],
  },
  idManagement: {
    key: STORAGE_KEYS.THEMES.ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['IDENTITY82', 'IDENTITY82AFF'],
  },
  environment: {
    key: STORAGE_KEYS.THEMES.ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['PLANET85'],
  },
  summer: {
    key: STORAGE_KEYS.THEMES.SUMMER_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['SUMMER80'],
  },
  anniversary: {
    key: STORAGE_KEYS.THEMES.ANNIVERSARY_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['INTERNXT5'],
  },
};

export class UserThemesService {
  constructor(private readonly usedCouponCodes: string[]) {}

  private isThemeAvailable(theme: Theme): boolean {
    const { key, promoCodes } = THEME_DEFINITIONS[theme];

    const cached = localStorageService.get(key);
    if (cached === 'true') return true;

    const hasUsedCoupon = promoCodes.some((code: string) => this.usedCouponCodes.includes(code));
    if (hasUsedCoupon) {
      localStorageService.set(key, 'true');
      return true;
    }

    return false;
  }

  public getAllAvailableThemes(): Theme[] {
    const themes = (Object.keys(THEME_DEFINITIONS) as Theme[]).map((theme) => {
      const available = this.isThemeAvailable(theme);
      return available ? theme : null;
    });

    return themes.filter((t): t is Theme => t !== null);
  }
}
