import { describe, it, expect, vi, afterEach } from 'vitest';
import { UserThemesService, THEME_DEFINITIONS } from './userThemes.service';
import localStorageService from 'services/local-storage.service';

const mockedCoupons = ['STARWARS85'];

vi.mock('services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('Checking available themes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('Is Theme Available', () => {
    it('When a theme is cached as available, then it returns true immediately without checking coupons', () => {
      const mockedKey = THEME_DEFINITIONS.starWars.key;
      const getFromStorageSpy = vi.spyOn(localStorageService, 'get').mockReturnValue('true');

      const availableThemeService = new UserThemesService(mockedCoupons);

      const isThemeAvailable = availableThemeService['isThemeAvailable']('starWars');

      expect(isThemeAvailable).toBe(true);
      expect(getFromStorageSpy).toBeCalledWith(mockedKey);
    });

    it('When at least one matching coupon is found and no cache exists, then it caches the theme and returns true', () => {
      const mockedKey = THEME_DEFINITIONS.starWars.key;

      const setFromStorageSpy = vi.spyOn(localStorageService, 'set');

      const availableThemeService = new UserThemesService(mockedCoupons);

      const isThemeAvailable = availableThemeService['isThemeAvailable']('starWars');

      expect(isThemeAvailable).toBe(true);
      expect(setFromStorageSpy).toHaveBeenCalledWith(mockedKey, 'true');
    });

    it('When the theme does not match, then false is returned indicating that the theme is not available', () => {
      const noMatchingCoupons = ['UNRELATED_COUPON'];
      const availableThemeService = new UserThemesService(noMatchingCoupons);

      const isThemeAvailable = availableThemeService['isThemeAvailable']('starWars');

      expect(isThemeAvailable).toBe(false);
    });
  });

  describe('Get All Available Themes', () => {
    it('When multiple themes are available, then it returns only those themes', () => {
      const mockedCoupons = ['SPECIALX80'];
      const service = new UserThemesService(mockedCoupons);

      const isThemeAvailableSpy = vi
        .spyOn(service as unknown as { isThemeAvailable: (theme: string) => boolean }, 'isThemeAvailable')
        .mockImplementation((theme) => ['starWars', 'halloween'].includes(theme));

      const availableThemes = service.getAllAvailableThemes();

      expect(availableThemes).toEqual(['starWars', 'halloween']);
      expect(isThemeAvailableSpy).toHaveBeenCalled();
      isThemeAvailableSpy.mockRestore();
    });

    it('When no themes are available, then it returns an empty array', async () => {
      const mockedCoupons: string[] = [];
      const service = new UserThemesService(mockedCoupons);

      const availableThemes = service.getAllAvailableThemes();

      expect(availableThemes).toEqual([]);
    });
  });
});
