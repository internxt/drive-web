import { describe, it, expect, vi, afterEach } from 'vitest';
import { AvailableThemesService, THEME_DEFINITIONS } from './availableThemes.service';
import localStorageService from 'app/core/services/local-storage.service';

const mockedCoupons = ['PROMOCODE'];

describe('Checking available themes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('Is Theme Available', () => {
    it('When a theme is cached as available, then it returns true immediately without checking coupons', () => {
      const mockedKey = THEME_DEFINITIONS.starWars.key;
      const getFromStorageSpy = vi.spyOn(localStorageService, 'get').mockReturnValue('true');

      const availableThemeService = new AvailableThemesService(mockedCoupons);

      const isThemeAvailable = availableThemeService['isThemeAvailable']('starWars');

      expect(isThemeAvailable).toBe(true);
      expect(getFromStorageSpy).toBeCalledWith(mockedKey);
    });

    it('When at least one matching coupon is found and no cache exists, then it caches the theme and returns true', () => {
      const mockedKey = THEME_DEFINITIONS.starWars.key;
      const promoCodeSpy = vi.spyOn(THEME_DEFINITIONS, 'starWars', 'get').mockReturnValue({
        key: mockedKey,
        promoCodes: [mockedCoupons[0]],
      });

      const setFromStorageSpy = vi.spyOn(localStorageService, 'set');

      const availableThemeService = new AvailableThemesService(mockedCoupons);

      const isThemeAvailable = availableThemeService['isThemeAvailable']('starWars');

      expect(isThemeAvailable).toBe(true);
      expect(setFromStorageSpy).toHaveBeenCalledWith(THEME_DEFINITIONS.starWars.key, 'true');
      promoCodeSpy.mockRestore();
    });

    it('When the theme does not match, then false is returned indicating that the theme is not available', () => {
      const availableThemeService = new AvailableThemesService(mockedCoupons);

      const isThemeAvailable = availableThemeService['isThemeAvailable']('starWars');

      expect(isThemeAvailable).toBe(false);
    });
  });

  describe('Get All Available Themes', () => {
    it('When multiple themes are available, then it returns only those themes', () => {
      const mockedCoupons = ['SPECIALX80'];
      const service = new AvailableThemesService(mockedCoupons);

      const isThemeAvailableSpy = vi
        .spyOn(service as any, 'isThemeAvailable')
        .mockImplementation((theme: string) => ['starWars', 'halloween'].includes(theme));

      const availableThemes = service.getAllAvailableThemes();

      expect(availableThemes).toEqual(['starWars', 'halloween']);
      expect(isThemeAvailableSpy).toHaveBeenCalled();
      isThemeAvailableSpy.mockRestore();
    });

    it('When no themes are available, then it returns an empty array', async () => {
      const mockedCoupons: string[] = [];
      const service = new AvailableThemesService(mockedCoupons);

      const availableThemes = service.getAllAvailableThemes();

      expect(availableThemes).toEqual([]);
    });
  });
});
