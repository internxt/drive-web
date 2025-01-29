import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const SUPERBOWL_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'superbowl_theme_enabled';

export const isSuperbowlThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const superbowlInLocalStorage = localStorageService.get(SUPERBOWL_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (superbowlInLocalStorage === 'true') return true;

  try {
    const coupons = ['SUPERBOWL80', 'SPECIALX80', 'REDDIT80', 'IGSPECIAL80'];

    const couponUsedResults = await Promise.all(coupons.map((code) => paymentService.isCouponUsedByUser(code)));
    const couponUsed = couponUsedResults.some((result) => result);

    if (couponUsed) {
      onSuccess?.();
      localStorageService.set(SUPERBOWL_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
