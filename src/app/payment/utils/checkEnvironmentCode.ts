import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'environment_theme_enabled';

export const isEnvironmentThemeAvailable = async (onSuccess?: () => void): Promise<boolean> => {
  const environmentInLocalStorage = localStorageService.get(ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (environmentInLocalStorage === 'true') return true;
  try {
    const coupons = ['PLANET85'];

    const couponUsedResults = await Promise.all(coupons.map((code) => paymentService.isCouponUsedByUser(code)));
    const couponUsed = couponUsedResults.some((result) => result?.couponUsed === true);

    if (couponUsed) {
      onSuccess?.();
      localStorageService.set(ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
