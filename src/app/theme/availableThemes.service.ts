import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import errorService from 'app/core/services/error.service';
import { Theme } from './ThemeProvider';

interface ThemeDefinition {
  key: string;
  promoCodes: string[];
}

const THEME_DEFINITIONS: Record<Exclude<Theme, 'light' | 'dark' | 'system'>, ThemeDefinition> = {
  starWars: {
    key: STORAGE_KEYS.THEMES.STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['STARWARS80', 'SPECIALX80'],
  },
  starWars2: {
    key: STORAGE_KEYS.THEMES.STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['STARWARS80', 'SPECIALX80'],
  },
  halloween: {
    key: STORAGE_KEYS.THEMES.HALLOWEEN_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['HALLOWEEN80'],
  },
  christmas: {
    key: STORAGE_KEYS.THEMES.CHRISTMAS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['CHRISTMAS80'],
  },
  superBowl: {
    key: STORAGE_KEYS.THEMES.SUPERBOWL_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['SUPERBOWL80', 'SPECIALX80', 'REDDIT80', 'IGSPECIAL80'],
  },
  stPatricks: {
    key: STORAGE_KEYS.THEMES.STPATRICKS_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['PADDY80'],
  },
  idManagement: {
    key: STORAGE_KEYS.THEMES.ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['IDENTITY82', 'IDENTITY82AFF'],
  },
  environment: {
    key: STORAGE_KEYS.THEMES.ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    promoCodes: ['PLANET85'],
  },
};

export class AvailableThemesService {
  private readonly usedCouponCodes: string[];

  constructor(usedCouponCodes: string[]) {
    this.usedCouponCodes = usedCouponCodes;
  }

  private async isThemeAvailable(theme: string): Promise<boolean> {
    const definition = THEME_DEFINITIONS[theme];
    if (!definition) return false;

    const cached = localStorageService.get(definition.key);
    if (cached === 'true') return true;

    try {
      const hasUsedCoupon = definition.promoCodes.some((code) => this.usedCouponCodes.includes(code));

      if (hasUsedCoupon) {
        localStorageService.set(definition.key, 'true');
        return true;
      }

      return false;
    } catch (error) {
      errorService.reportError(error);
      return false;
    }
  }

  async getAllAvailableThemes(): Promise<string[]> {
    const entries = await Promise.all(
      Object.keys(THEME_DEFINITIONS).map(async (theme) => ({
        theme,
        available: await this.isThemeAvailable(theme),
      })),
    );

    return entries.filter((entry) => entry.available).map((entry) => entry.theme);
  }
}
