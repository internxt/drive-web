import { renderHook } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import gaService from 'app/analytics/ga.service';
import { localStorageService, STORAGE_KEYS } from 'services';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('Analytics custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When checkout is ready and a plan is selected, then it tracks begin checkout and stores the gclid', () => {
    const selectedPlan: any = {
      price: {
        id: 'plan_123',
        decimalAmount: 9.99,
        currency: 'eur',
        type: 'individual',
        interval: 'month',
        bytes: 1000000000,
      },
    };
    const promoCodeData = {
      codeId: 'PROMO10',
      codeName: 'PROMO10',
    };
    const gclid = 'test-gclid';
    const trackBeginCheckoutSpy = vi.spyOn(gaService, 'trackBeginCheckout').mockReturnValue();
    const localStorageServiceSpy = vi.spyOn(localStorageService, 'set').mockReturnValue();

    renderHook(() =>
      useAnalytics({
        isCheckoutReady: true,
        selectedPlan,
        promoCodeData,
        businessSeats: 1,
        gclid,
      }),
    );

    expect(trackBeginCheckoutSpy).toHaveBeenCalledWith({
      planId: 'plan_123',
      planPrice: 9.99,
      currency: 'eur',
      planType: 'individual',
      interval: 'month',
      storage: '1000000000',
      promoCodeId: 'PROMO10',
      couponCodeData: promoCodeData,
      seats: 1,
    });

    expect(localStorageServiceSpy).toHaveBeenCalledWith(STORAGE_KEYS.GCLID, gclid);

    expect(document.cookie).toContain(`gclid=${gclid}`);
  });
});
