import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

export const MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'managementid_theme_enabled';

export const isManagementIdThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  const managementIdInLocalStorage = localStorageService.get(MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (managementIdInLocalStorage === 'true') return true;
  try {
    const couponUsedResult = await paymentService.isCouponUsedByUser('IDENTITY82');

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
      return true;
    }

    return false;
  } catch (err) {
    errorService.reportError(err);
    return false;
  }
};
