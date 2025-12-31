import { useEffect } from 'react';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import gaService from 'app/analytics/ga.service';
import { CouponCodeData } from '../types';
import { localStorageService, STORAGE_KEYS } from 'services';

const GCLID_COOKIE_LIFESPAN_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const useAnalytics = ({
  isCheckoutReady,
  selectedPlan,
  promoCodeData,
  businessSeats,
  gclid,
}: {
  isCheckoutReady: boolean;
  businessSeats: number;
  selectedPlan?: PriceWithTax;
  promoCodeData?: CouponCodeData;
  gclid?: string;
}) => {
  useEffect(() => {
    if (isCheckoutReady && selectedPlan?.price) {
      gaService.trackBeginCheckout({
        planId: selectedPlan.price.id,
        planPrice: selectedPlan.price.decimalAmount,
        currency: selectedPlan.price.currency ?? 'eur',
        planType: selectedPlan.price.type === 'business' ? 'business' : 'individual',
        interval: selectedPlan.price.interval,
        storage: selectedPlan.price.bytes.toString(),
        promoCodeId: promoCodeData?.codeName ?? undefined,
        couponCodeData: promoCodeData,
        seats: selectedPlan.price.type === 'business' ? businessSeats : 1,
      });

      if (gclid) {
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + GCLID_COOKIE_LIFESPAN_DAYS * MILLISECONDS_PER_DAY);
        document.cookie = `gclid=${gclid}; expires=${expiryDate.toUTCString()}; path=/`;
        localStorageService.set(STORAGE_KEYS.GCLID, gclid);
      }
    }
  }, [isCheckoutReady]);
};
