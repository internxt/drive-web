import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const STPATRICKS_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'stpatricks_theme_enabled';

export const iStPatricksThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const stPatricksInLocalStorage = localStorageService.get(STPATRICKS_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (stPatricksInLocalStorage === 'true') return true;
  try {
    const couponUsedResult = await paymentService.isCouponUsedByUser('STPADDYS80');

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(STPATRICKS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
