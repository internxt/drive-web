import localStorageService from 'app/core/services/local-storage.service';
import { bytesToString } from 'app/drive/services/size.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';

export const STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY = 'star_wars_theme_enabled';

const LifetimeCoupons = {
  '2TB': 'STAR_WARS_2TB_LIFETIME',
  '5TB': 'STAR_WARS_5TB_LIFETIME',
  '10TB': 'STAR_WARS_10TB_LIFETIME',
};

const fetchCouponCode = async (couponName: string) => {
  const coupon = await fetch(`https://internxt.com/api/stripe/get_coupons?coupon=${couponName}`, {
    method: 'GET',
  });

  const couponJson = await coupon.text();

  return couponJson;
};

export const isStarWarsThemeAvailable = async (plan: PlanState, onSuccess?: () => void): Promise<boolean> => {
  let isCouponUsed;
  const starWarsInLocalStorage = localStorageService.get(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY);

  if (starWarsInLocalStorage === 'true') return true;

  const { individualPlan, subscription } = plan;

  const storageLimit = individualPlan?.storageLimit;

  // Check if user used the coupon code
  if (subscription?.type === 'subscription') {
    const coupon = await fetchCouponCode('STAR_WARS_SUBSCRIPTION');
    const couponUsedResult = await paymentService.isCouponUsedByUser(coupon);

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
    }

    isCouponUsed = couponUsedResult.couponUsed;
  } else if (individualPlan?.isLifetime) {
    const coupon = await fetchCouponCode(LifetimeCoupons[bytesToString(storageLimit as number)]);
    const couponUsedResult = await paymentService.isCouponUsedByUser(coupon);

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
    }
    isCouponUsed = couponUsedResult.couponUsed;
  }

  return isCouponUsed;
};
