import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const HALLOWEEN_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'halloween_theme_enabled';

export const isHalloweenThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const halloweenInLocalStorage = localStorageService.get(HALLOWEEN_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (halloweenInLocalStorage === 'true') return true;
  try {
    // Check if user used the coupon code 'HORROR80'
    const couponUsedResult = await paymentService.isCouponUsedByUser('HORROR80');

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(HALLOWEEN_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
