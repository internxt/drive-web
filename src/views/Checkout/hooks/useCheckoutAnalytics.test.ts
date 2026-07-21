import { describe, test, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

import gaService from 'app/analytics/ga.service';
import metaService from 'app/analytics/meta.service';
import { handleImpactDTCCheckout } from 'app/analytics/impact.service';
import { LocalStorageItem } from 'app/core/types';
import envService from 'services/env.service';
import localStorageService from 'services/local-storage.service';
import referralService from 'services/referral.service';
import { checkoutService } from '../services';
import { useCheckoutAnalytics } from './useCheckoutAnalytics';

vi.mock('app/analytics/impact.service', async (importActual) => ({
  ...(await importActual<typeof import('app/analytics/impact.service')>()),
  handleImpactDTCCheckout: vi.fn(),
}));

const mockSelectedPlan: PriceWithTax = {
  price: {
    id: 'price_123',
    bytes: 1099511627776,
    decimalAmount: 10,
    product: 'prod_1234',
    currency: 'eur',
    amount: 10,
    interval: 'year',
    type: UserType.Individual,
  },
  taxes: {
    amountWithTax: 1210,
    decimalTax: 12.1,
    tax: 210,
    decimalAmountWithTax: 12.1,
  },
};

const buildProps = (overrides = {}) => ({
  gclid: undefined,
  irclickid: undefined,
  utmMedium: undefined,
  isCheckoutReady: false,
  isAuthenticated: false,
  selectedPlan: mockSelectedPlan,
  promotionCode: undefined,
  promoCodeData: undefined,
  ...overrides,
});

describe('Checkout analytics custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(referralService, 'captureUcc').mockResolvedValue(null);
    vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
    vi.spyOn(gaService, 'trackBeginCheckout').mockImplementation(() => {});
    vi.spyOn(metaService, 'trackCheckoutStart').mockImplementation(() => {});
    vi.spyOn(checkoutService, 'trackIncompleteCheckout').mockResolvedValue(undefined as never);
    vi.spyOn(envService, 'isProduction').mockReturnValue(true);
  });

  describe('Attribution capture on mount', () => {
    test('When the user arrives with a Google click id, then it is persisted for later attribution', () => {
      renderHook(() => useCheckoutAnalytics(buildProps({ gclid: 'gclid_123' })));

      expect(localStorageService.set).toHaveBeenCalledWith(LocalStorageItem.GCLID, 'gclid_123');
    });

    test('When the user arrives with an Impact click id, then the Impact checkout event is tracked', () => {
      renderHook(() => useCheckoutAnalytics(buildProps({ irclickid: 'ir_123', utmMedium: 'affiliate' })));

      expect(handleImpactDTCCheckout).toHaveBeenCalledWith({ irclickid: 'ir_123', utmMedium: 'affiliate' });
    });

    test('When the checkout mounts, then the referral code is always captured', () => {
      renderHook(() => useCheckoutAnalytics(buildProps()));

      expect(referralService.captureUcc).toHaveBeenCalledTimes(1);
    });

    test('When the user arrives without attribution ids, then neither the Impact event nor the click id are stored', () => {
      renderHook(() => useCheckoutAnalytics(buildProps()));

      expect(handleImpactDTCCheckout).not.toHaveBeenCalled();
      expect(localStorageService.set).not.toHaveBeenCalled();
    });
  });

  describe('Begin checkout tracking', () => {
    test('When the checkout is ready, then the begin-checkout event is reported to Google and Meta', () => {
      renderHook(() => useCheckoutAnalytics(buildProps({ isCheckoutReady: true, promotionCode: 'SUMMER' })));

      expect(gaService.trackBeginCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'price_123',
          currency: 'eur',
          planType: 'individual',
          promoCodeId: 'SUMMER',
        }),
      );
      expect(metaService.trackCheckoutStart).toHaveBeenCalledWith({
        value: mockSelectedPlan.price.decimalAmount,
        currency: 'eur',
        content_ids: ['price_123'],
      });
    });

    test('When the checkout is not ready yet, then the begin-checkout event is not reported', () => {
      renderHook(() => useCheckoutAnalytics(buildProps({ isCheckoutReady: false })));

      expect(gaService.trackBeginCheckout).not.toHaveBeenCalled();
      expect(metaService.trackCheckoutStart).not.toHaveBeenCalled();
    });
  });

  describe('Incomplete checkout tracking', () => {
    test('When an authenticated user reaches the checkout in production, then the incomplete checkout is tracked once', () => {
      const { rerender } = renderHook((props) => useCheckoutAnalytics(props), {
        initialProps: buildProps({ isAuthenticated: true }),
      });

      rerender(buildProps({ isAuthenticated: true }));

      expect(checkoutService.trackIncompleteCheckout).toHaveBeenCalledTimes(1);
      expect(checkoutService.trackIncompleteCheckout).toHaveBeenCalledWith(
        mockSelectedPlan,
        mockSelectedPlan.taxes?.amountWithTax,
      );
    });

    test('When the user is not authenticated, then the incomplete checkout is not tracked', () => {
      renderHook(() => useCheckoutAnalytics(buildProps({ isAuthenticated: false })));

      expect(checkoutService.trackIncompleteCheckout).not.toHaveBeenCalled();
    });

    test('When the app is not running in production, then the incomplete checkout is not tracked', () => {
      (envService.isProduction as Mock).mockReturnValue(false);

      renderHook(() => useCheckoutAnalytics(buildProps({ isAuthenticated: true })));

      expect(checkoutService.trackIncompleteCheckout).not.toHaveBeenCalled();
    });
  });
});
