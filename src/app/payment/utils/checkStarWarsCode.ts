import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'star_wars_theme_enabled';

export const isStarWarsThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const starWarsInLocalStorage = localStorageService.get(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (starWarsInLocalStorage === 'true') return true;

  const { individualSubscription, businessSubscription } = plan;

  try {
    // Check if user used the coupon code
    if (individualSubscription?.type === 'subscription' || businessSubscription?.type === 'subscription') {
      const couponUsedResult = await paymentService.isCouponUsedByUser('STARWARS85');

      if (couponUsedResult.couponUsed) {
        onSuccess?.();
        localStorageService.set(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
        return true;
      }

      return false;
    } else if (individualSubscription?.type === 'lifetime' || businessSubscription?.type === 'lifetime') {
      const couponUsedLifetimeResult = await paymentService.isCouponUsedByUser('STARWARS85');
      if (couponUsedLifetimeResult.couponUsed) {
        onSuccess?.();
        localStorageService.set(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedLifetimeResult.couponUsed}`);
        return true;
      }

      return false;
    }
  } catch (err) {
    errorService.reportError(err);
    return false;
  }

  return false;
};
