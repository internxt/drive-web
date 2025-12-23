import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInitializeCheckout } from './useInitializeCheckout';
import { checkoutService, currencyService, paymentService } from '../services';
import { navigationService } from 'services';
import { AppView } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { StripeTheme } from '../constants';

const LIGHT_THEME: StripeTheme = 'light';

describe('Initialize checkout custom hook', () => {
  const mockTranslate = vi.fn((key: string) => key);

  const mockStripe = {
    elements: vi.fn(),
    confirmPayment: vi.fn(),
  };

  const mockStripeElementsOptions = {
    appearance: {},
    mode: 'subscription',
    amount: 1210,
    currency: 'eur',
    payment_method_types: ['card', 'paypal'],
  };

  const mockCryptoCurrencies = [
    { id: 'BTC', name: 'Bitcoin' },
    { id: 'ETH', name: 'Ethereum' },
  ];

  const mockPriceWithTax: PriceWithTax = {
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

  const mockLifetimePriceWithTax: PriceWithTax = {
    ...mockPriceWithTax,
    price: {
      ...mockPriceWithTax.price,
      interval: 'lifetime',
    },
  };

  const mockUser: UserSettings = {
    userId: 'user_123',
    email: 'test@test.com',
  } as UserSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(paymentService, 'getStripe').mockResolvedValue(mockStripe as any);
    vi.spyOn(checkoutService, 'loadStripeElements').mockResolvedValue(mockStripeElementsOptions as any);
    vi.spyOn(currencyService, 'getAvailableCryptoCurrencies').mockResolvedValue(mockCryptoCurrencies as any);
    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(notificationsService, 'show').mockImplementation(() => '');
  });

  describe('Initialization', () => {
    test('When the hook is initialized, then Stripe SDK is loaded', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        translate: mockTranslate,
      };

      renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(paymentService.getStripe).toHaveBeenCalled();
      });
    });

    test('When Stripe SDK fails to load, then user is redirected to signup page', async () => {
      vi.spyOn(paymentService, 'getStripe').mockRejectedValue(new Error('Stripe failed'));
      const props = {
        checkoutTheme: LIGHT_THEME,
        translate: mockTranslate,
      };

      renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Signup);
      });
    });

    test('When Stripe SDK fails to load and user is logged in, then user is redirected to drive page', async () => {
      vi.spyOn(paymentService, 'getStripe').mockRejectedValue(new Error('Stripe failed'));
      const props = {
        checkoutTheme: LIGHT_THEME,
        user: mockUser,
        translate: mockTranslate,
      };

      renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive);
      });
    });
  });

  describe('Loading Stripe elements', () => {
    test('When Stripe SDK is loaded and price is provided, then Stripe elements are loaded', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        price: mockPriceWithTax,
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(checkoutService.loadStripeElements).toHaveBeenCalled();
        expect(result.current.stripeElementsOptions).toBeDefined();
      });
    });

    test('When Stripe elements fail to load, then user is redirected to signup page', async () => {
      vi.spyOn(checkoutService, 'loadStripeElements').mockRejectedValue(new Error('Failed to load elements'));
      const props = {
        checkoutTheme: LIGHT_THEME,
        price: mockPriceWithTax,
        translate: mockTranslate,
      };

      renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Signup);
      });
    });

    test('When no price is provided, then Stripe elements are not loaded', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(result.current.stripeSdk).toBeDefined();
      });
      expect(checkoutService.loadStripeElements).not.toHaveBeenCalled();
    });
  });

  describe('Loading crypto currencies', () => {
    test('When the plan is lifetime, then crypto currencies are fetched', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        price: mockLifetimePriceWithTax,
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(currencyService.getAvailableCryptoCurrencies).toHaveBeenCalled();
        expect(result.current.availableCryptoCurrencies).toEqual(mockCryptoCurrencies);
      });
    });

    test('When the plan is not lifetime, then crypto currencies are not fetched', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        price: mockPriceWithTax,
        translate: mockTranslate,
      };

      renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(currencyService.getAvailableCryptoCurrencies).not.toHaveBeenCalled();
      });
    });

    test('When fetching crypto currencies fails, then a notification is shown', async () => {
      vi.spyOn(currencyService, 'getAvailableCryptoCurrencies').mockRejectedValue(new Error('Crypto fetch failed'));
      const props = {
        checkoutTheme: LIGHT_THEME,
        price: mockLifetimePriceWithTax,
        translate: mockTranslate,
      };

      renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(notificationsService.show).toHaveBeenCalledWith({
          text: 'checkout.error.fetchingCryptoCurrencies',
          type: ToastType.Error,
        });
      });
    });
  });

  describe('Checkout ready state', () => {
    test('When all initialization is complete, then the checkout is ready', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        price: mockPriceWithTax,
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(result.current.isCheckoutReady).toBe(true);
      });
    });

    test('When hook is initialized without price, then the checkout is not ready', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(result.current.stripeSdk).toBeDefined();
      });
      expect(result.current.isCheckoutReady).toBe(false);
    });
  });

  describe('Hook return values', () => {
    test('When the hook is initialized, then it returns all expected values', async () => {
      const props = {
        checkoutTheme: LIGHT_THEME,
        price: mockPriceWithTax,
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useInitializeCheckout(props));

      await waitFor(() => {
        expect(result.current.isCheckoutReady).toBe(true);
      });

      expect(result.current).toHaveProperty('stripeSdk');
      expect(result.current).toHaveProperty('stripeElementsOptions');
      expect(result.current).toHaveProperty('availableCryptoCurrencies');
      expect(result.current).toHaveProperty('isCheckoutReady');
    });
  });
});
