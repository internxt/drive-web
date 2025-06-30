import localStorageService from 'app/core/services/local-storage.service';
import { STORAGE_KEYS } from 'app/core/services/storage-keys';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const isSummerThemeAvailable = async (onSuccess?: () => void): Promise<boolean> => {
  const summerInLocalStorage = localStorageService.get(STORAGE_KEYS.THEMES.SUMMER_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (summerInLocalStorage === 'true') return true;
  try {
    const couponUsedResult = await paymentService.isCouponUsedByUser('SUMMER80');

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(STORAGE_KEYS.THEMES.SUMMER_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
