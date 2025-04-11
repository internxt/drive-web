import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';

export const isManagementIdThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const managementIdInLocalStorage = localStorageService.get(
    STORAGE_KEYS.THEMES.ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
  );

  if (managementIdInLocalStorage === 'true') return true;
  const coupons = ['IDENTITY82', 'IDENTITY82AFF'];

  try {
    const couponUsedResults = await Promise.all(coupons.map((code) => paymentService.isCouponUsedByUser(code)));
    const couponUsed = couponUsedResults.some((result) => result.couponUsed);
    if (couponUsed) {
      onSuccess?.();
      localStorageService.set(STORAGE_KEYS.THEMES.ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
      return true;
    }
  } catch (err) {
    console.log(`[COUPON CODE CHECK/ERROR]: User does not have any relationship with ${coupons.join(', ')}`);
    return false;
  }

  return false;
};
