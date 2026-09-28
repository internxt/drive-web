import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { checkoutService } from '../services';
import { useEffect, useState } from 'react';
import currencyService from '../services/currency.service';
import { Translate } from 'app/i18n/types';

interface UseProductsProps {
  planId: string | null;
  promotionCode?: string;
  currency?: string;
  userLocation?: string;
  userAddress?: string;
  country?: string;
  postalCode?: string;
  isPromoCodeResolved?: boolean;
  translate: Translate;
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

export const useProducts = ({
  currency,
  planId,
  promotionCode,
  userLocation,
  userAddress,
  country,
  isPromoCodeResolved,
}: UseProductsProps) => {
  const [selectedPlan, setSelectedPlan] = useState<PriceWithTax>();

  useEffect(() => {
    if (!planId || !userAddress) return;
    if (isPromoCodeResolved === false) return;

    const currencyPlan = currencyService.getCurrencyForLocation(userLocation, currency);

    fetchSelectedPlan({ priceId: planId, currency: currencyPlan, userAddress, promotionCode, country });
  }, [userLocation, userAddress, promotionCode, country, isPromoCodeResolved]);

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
    setSelectedPlan({ ...plan, ...amount });

    return plan;
  };

  return {
    selectedPlan,
    fetchSelectedPlan,
  };
};
