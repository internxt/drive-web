import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';

export const MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'managementid_theme_enabled';
export const ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'managementid_theme_enabled';

export const isManagementIdThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const managementIdInLocalStorage = localStorageService.get(ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (managementIdInLocalStorage === 'true') return true;
  try {
    const coupons = ['IDENTITY82', 'IDENTITY82AFF'];

    const couponUsedResults = await Promise.all(coupons.map((code) => paymentService.isCouponUsedByUser(code)));
    const couponUsed = couponUsedResults.some((result) => result.couponUsed);

    if (couponUsed) {
      onSuccess?.();
      localStorageService.set(ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
      return true;
    }

    return false;
  } catch (err) {
    return false;
  }
};
