import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const isEnvironmentThemeAvailable = async (onSuccess?: () => void): Promise<boolean> => {
  const environmentInLocalStorage = localStorageService.get(STORAGE_KEYS.THEMES.ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (environmentInLocalStorage === 'true') return true;
  try {

    const couponUsedResult = await paymentService.isCouponUsedByUser('PLANET85');

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(STORAGE_KEYS.THEMES.ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
