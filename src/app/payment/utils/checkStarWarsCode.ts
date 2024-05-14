import localStorageService from 'app/core/services/local-storage.service';
import { PlanState } from 'app/store/slices/plan';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

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

  const { subscription } = plan;

  // Check if user used the coupon code
  if (subscription?.type === 'subscription') {
    const coupon = await fetchCouponCode('STAR_WARS_SUBSCRIPTION');
    const couponUsedResult = await paymentService.isCouponUsedByUser(coupon);

    if (couponUsedResult.couponUsed) {
      onSuccess?.();
      localStorageService.set(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUsedResult.couponUsed}`);
    }

    isCouponUsed = couponUsedResult.couponUsed;
  } else if (subscription?.type === 'lifetime') {
    let couponUserResult;
    let TwoTBCoupon;
    let FiveTBCoupon;
    let TenTBCoupon;

    Promise.all([
      fetchCouponCode(LifetimeCoupons['2TB']),
      fetchCouponCode(LifetimeCoupons['5TB']),
      fetchCouponCode(LifetimeCoupons['10TB']),
    ])
      .then(([twoTB, fiveTB, tenTB]) => {
        TwoTBCoupon = twoTB;
        FiveTBCoupon = fiveTB;
        TenTBCoupon = tenTB;

        Array.from([TwoTBCoupon, FiveTBCoupon, TenTBCoupon]).map(async (coupon) => {
          const couponUser = await paymentService.isCouponUsedByUser(coupon);
          if (couponUser.couponUsed) {
            couponUserResult = couponUser;
            return;
          }
        });

        if (couponUserResult.couponUsed) {
          onSuccess?.();
          localStorageService.set(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, `${couponUserResult.couponUsed}`);
        }
        isCouponUsed = couponUserResult.couponUsed;
      })
      .catch((err) => {
        errorService.reportError(err);
      });
  }

  return isCouponUsed;
};
