import { useEffect, useState } from 'react';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { checkoutService } from '../services';
import { CouponCodeData } from '../types';
import { STATUS_CODE_ERROR } from '../constants';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

interface UseProductsProps {
  planId: string | null;
  promotionCode: string | null;
  currency?: string;
  userAddress?: string;
  country?: string;
  postalCode?: string;
  translate: (key: string) => string;
}

interface FetchSelectedPlanPayload {
  priceId: string;
  promotionCode?: string;
  postalCode?: string;
  country?: string;
  userAddress?: string;
  currency?: string;
  mobileToken?: string;
}

export const useProducts = ({ currency, translate, planId, promotionCode, userAddress }: UseProductsProps) => {
  const [selectedPlan, setSelectedPlan] = useState<PriceWithTax>();
  const [businessSeats, setBusinessSeats] = useState<number>(1);
  const [promoCodeData, setPromoCodeData] = useState<CouponCodeData | undefined>(undefined);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId || !userAddress) return;

    if (promotionCode) {
      fetchSelectedPlan({ priceId: planId, currency, userAddress, promotionCode });
      fetchPromotionCode({ priceId: planId, promotionCode });
    } else {
      fetchSelectedPlan({ priceId: planId, currency, userAddress });
    }
  }, [userAddress, promotionCode]);

  const fetchSelectedPlan = async ({
    priceId,
    promotionCode,
    currency = 'eur',
    userAddress,
    postalCode,
    country,
    mobileToken,
  }: FetchSelectedPlanPayload): Promise<PriceWithTax> => {
    const plan = await checkoutService.getPriceById({
      priceId,
      userAddress,
      currency,
      promoCodeName: promotionCode ?? undefined,
      postalCode,
      country,
    });
    const amount = mobileToken ? { amount: 0, decimalAmount: 0 } : {};
    setSelectedPlan({ ...plan, price: { ...plan.price, ...amount } });
    if (plan?.price?.minimumSeats) {
      setBusinessSeats(plan.price.minimumSeats);
    }

    return plan;
  };

  const fetchPromotionCode = async ({
    priceId,
    promotionCode,
  }: {
    priceId: string;
    promotionCode: string;
  }): Promise<CouponCodeData> => {
    const promoCodeData = await checkoutService.fetchPromotionCodeByName(priceId, promotionCode);

    setPromoCodeData(promoCodeData);

    return promoCodeData;
  };

  const removeCouponCode = () => {
    setPromoCodeData(undefined);
    setCouponError(null);
  };

  const onPromoCodeError = (err: unknown, showNotification?: boolean) => {
    const error = err as Error;
    const statusCode = (err as any).status;
    let errorMessage = translate('notificationMessages.errorApplyingCoupon');
    if (statusCode) {
      if (
        statusCode === STATUS_CODE_ERROR.PROMO_CODE_BY_NAME_NOT_FOUND ||
        statusCode === STATUS_CODE_ERROR.BAD_REQUEST
      ) {
        errorMessage = error.message;
      }
    }
    setCouponError(errorMessage);
    setPromoCodeData(undefined);

    if (showNotification) {
      notificationsService.show({
        text: errorMessage,
        type: ToastType.Error,
      });
    }
  };

  const onCouponChanges = async (userAddress?: string, promoCodeName?: string) => {
    const priceId = selectedPlan?.price?.id;
    if (!priceId) {
      return;
    }

    try {
      if (promoCodeName) {
        await fetchPromotionCode({ priceId, promotionCode: promoCodeName });
      }
    } catch (error) {
      onPromoCodeError(error);
    }

    try {
      await fetchSelectedPlan({
        priceId,
        userAddress: userAddress,
        promotionCode: promoCodeName,
      });
    } catch (error) {
      console.error('Error fetching price with taxes', error);
    }
  };

  return {
    selectedPlan,
    promoCodeData,
    couponError,
    businessSeats,
    fetchSelectedPlan,
    fetchPromotionCode,
    removeCouponCode,
    onPromoCodeError,
    onCouponChanges,
  };
};
