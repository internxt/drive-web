import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { useEffect, useRef } from 'react';

import gaService from 'app/analytics/ga.service';
import metaService from 'app/analytics/meta.service';
import { handleImpactDTCCheckout } from 'app/analytics/impact.service';
import { LocalStorageItem } from 'app/core/types';
import envService from 'services/env.service';
import localStorageService from 'services/local-storage.service';
import referralService from 'services/referral.service';
import { checkoutService } from '../services';
import { GCLID_COOKIE_LIFESPAN_DAYS, MILLISECONDS_PER_DAY } from '../constants';

interface UseCheckoutAnalyticsProps {
  gclid?: string | null;
  irclickid?: string | null;
  utmMedium?: string | null;
  isCheckoutReady: boolean;
  isAuthenticated: boolean;
  selectedPlan?: PriceWithTax;
  promotionCode?: string | null;
  promoCodeData?: CouponCodeData;
}

export const useCheckoutAnalytics = ({
  gclid,
  irclickid,
  utmMedium,
  isCheckoutReady,
  isAuthenticated,
  selectedPlan,
  promotionCode,
  promoCodeData,
}: UseCheckoutAnalyticsProps) => {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (gclid) {
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + GCLID_COOKIE_LIFESPAN_DAYS * MILLISECONDS_PER_DAY);
      document.cookie = `gclid=${gclid}; expires=${expiryDate.toUTCString()}; path=/; domain=.internxt.com; Secure`;
      localStorageService.set(LocalStorageItem.GCLID, gclid);
    }
    if (irclickid) {
      handleImpactDTCCheckout({ irclickid, utmMedium });
    }
    referralService.captureUcc();
  }, []);

  useEffect(() => {
    if (isCheckoutReady && selectedPlan?.price) {
      gaService.trackBeginCheckout({
        planId: selectedPlan.price.id,
        planPrice: selectedPlan.price.decimalAmount,
        currency: selectedPlan.price.currency ?? 'eur',
        planType: selectedPlan.price.type === 'business' ? 'business' : 'individual',
        interval: selectedPlan.price.interval,
        storage: selectedPlan.price.bytes.toString(),
        promoCodeId: promotionCode ?? undefined,
        couponCodeData: promoCodeData,
        seats: 1,
      });

      metaService.trackCheckoutStart({
        value: selectedPlan.price.decimalAmount,
        currency: selectedPlan.price.currency ?? 'eur',
        content_ids: [selectedPlan.price.id],
      });
    }
  }, [isCheckoutReady]);

  useEffect(() => {
    if (envService.isProduction() && selectedPlan?.price && isAuthenticated && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      const planPrice = selectedPlan.taxes?.amountWithTax || selectedPlan.price.amount;
      checkoutService.trackIncompleteCheckout(selectedPlan, planPrice);
    }
  }, [selectedPlan, isAuthenticated]);
};
