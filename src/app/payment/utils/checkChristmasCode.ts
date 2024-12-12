import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const CHRISTMAS_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'christmas_theme_enabled';

export const isChristmasThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const christmasInLocalStorage = localStorageService.get(CHRISTMAS_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (christmasInLocalStorage === 'true') return true;
  try {
    const couponUsedResult = await paymentService.isCouponUsedByUser('SECRETSANTA80');

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(CHRISTMAS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
