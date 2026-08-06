import { useEffect } from 'react';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';

interface FetchSelectedPlanPayload {
  priceId: string;
  promotionCode?: string;
  postalCode?: string;
  country?: string;
  userAddress?: string;
  currency?: string;
  mobileToken?: string;
}

interface UsePriceRefetchOnAddressChangeProps {
  selectedPlan?: PriceWithTax;
  billingCountry?: string;
  billingPostalCode?: string;
  promotionCode?: string;
  fetchSelectedPlan: (payload: FetchSelectedPlanPayload) => Promise<PriceWithTax>;
  debounceMs?: number;
}

/**
 * Refetches the selected plan (and its tax breakdown) once the user's billing
 * country and postal code are both known, so the price shown always matches
 * the tax jurisdiction used at payment time.
 */
export const usePriceRefetchOnAddressChange = ({
  selectedPlan,
  billingCountry,
  billingPostalCode,
  promotionCode,
  fetchSelectedPlan,
  debounceMs = 500,
}: UsePriceRefetchOnAddressChangeProps) => {
  useEffect(() => {
    if (!selectedPlan?.price?.id || !selectedPlan?.price?.currency) {
      return;
    }

    if (!billingCountry || !billingPostalCode) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchSelectedPlan({
        priceId: selectedPlan.price.id,
        currency: selectedPlan.price.currency,
        promotionCode: promotionCode ?? undefined,
        postalCode: billingPostalCode,
        country: billingCountry,
      });
    }, debounceMs);

    return () => clearTimeout(debounceTimer);
  }, [billingCountry, billingPostalCode, selectedPlan?.price?.id, selectedPlan?.price?.currency]);
};
