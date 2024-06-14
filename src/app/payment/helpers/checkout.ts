import checkoutService from '../views/CheckoutView/services/checkout.service';
import { CouponCodeData, SelectedPlanData } from '../views/CheckoutView/types';

export const fetchPlanById = async (planId: string): Promise<SelectedPlanData> => {
  const plan = await checkoutService.fetchPlanById(planId);
  return {
    amount: plan.amount,
    amountWithDecimals: plan.amount / 100,
    bytes: plan.bytes,
    currency: plan.currency,
    id: plan.id,
    interval: plan.interval,
  };
};

export const fetchPromotionCodeByName = async (promotionCode: string): Promise<CouponCodeData> => {
  const promoCodeData = await checkoutService.fetchPromotionCodeByName(promotionCode);
  return {
    codeId: promoCodeData.codeId,
    codeName: promotionCode,
    amountOff: promoCodeData.amountOff,
    percentOff: promoCodeData.percentOff,
  };
};
