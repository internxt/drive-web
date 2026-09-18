import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Stripe } from '@stripe/stripe-js';
import { renderHook, waitFor } from '@testing-library/react';
import { AppView } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { navigationService } from 'services';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { checkoutService, currencyService, paymentService } from 'views/Checkout/services';
import { BF_CHECKOUT_THEME_STYLES } from '../constants';
import { useInitializeBfCheckout } from './useInitializeBfCheckout';

describe('Initialize BF checkout custom hook', () => {
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

  const mockPriceWithTax: PriceWithTax = {
    price: {
      id: 'price_123',
      bytes: 5497558138880,
      decimalAmount: 29.99,
      product: 'prod_1234',
      currency: 'eur',
      amount: 2999,
      interval: 'month',
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
    vi.spyOn(paymentService, 'getStripe').mockResolvedValue(mockStripe as unknown as Stripe);
    vi.spyOn(checkoutService, 'loadStripeElements').mockImplementation(async (_theme, plan) => ({
      ...mockStripeElementsOptions,
      mode: plan.price.interval === 'lifetime' ? 'payment' : 'subscription',
    }));
    vi.spyOn(currencyService, 'getAvailableCryptoCurrencies').mockResolvedValue([]);
    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(notificationsService, 'show').mockImplementation(() => '');
  });

  describe('Initialization', () => {
    test('When the hook is initialized, then Stripe SDK is loaded', async () => {
      renderHook(() => useInitializeBfCheckout({ translate: mockTranslate }));

      await waitFor(() => {
        expect(paymentService.getStripe).toHaveBeenCalled();
      });
    });

    test('When Stripe SDK fails to load, then user is redirected to signup page', async () => {
      vi.spyOn(paymentService, 'getStripe').mockRejectedValue(new Error('Stripe failed'));

      renderHook(() => useInitializeBfCheckout({ translate: mockTranslate }));

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Signup);
      });
    });

    test('When Stripe SDK fails to load and user is logged in, then user is redirected to drive page', async () => {
      vi.spyOn(paymentService, 'getStripe').mockRejectedValue(new Error('Stripe failed'));

      renderHook(() => useInitializeBfCheckout({ user: mockUser, translate: mockTranslate }));

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive);
      });
    });
  });

  describe('Loading Stripe elements', () => {
    test('When Stripe SDK is loaded and price is provided, then Stripe elements are loaded with the BF checkout dark styles', async () => {
      const { result } = renderHook(() =>
        useInitializeBfCheckout({ price: mockPriceWithTax, translate: mockTranslate }),
      );

      await waitFor(() => {
        expect(result.current.stripeElementsOptions).toBeDefined();
      });
      expect(checkoutService.loadStripeElements).toHaveBeenCalledWith(BF_CHECKOUT_THEME_STYLES, mockPriceWithTax);
    });

    test('When Stripe elements fail to load, then user is redirected to signup page', async () => {
      vi.spyOn(checkoutService, 'loadStripeElements').mockRejectedValue(new Error('Failed to load elements'));

      renderHook(() => useInitializeBfCheckout({ price: mockPriceWithTax, translate: mockTranslate }));

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Signup);
      });
    });

    test('When no price is provided, then Stripe elements are not loaded', async () => {
      const { result } = renderHook(() => useInitializeBfCheckout({ translate: mockTranslate }));

      await waitFor(() => {
        expect(result.current.stripeSdk).toBeDefined();
      });
      expect(checkoutService.loadStripeElements).not.toHaveBeenCalled();
    });
  });

  describe('Updating the Stripe elements amount', () => {
    const propsFor = (price: PriceWithTax, amountWithTax = price.taxes.amountWithTax) => ({
      price: { ...price, taxes: { ...price.taxes, amountWithTax } },
      translate: mockTranslate,
    });

    const renderWithInitialAmount = async (price: PriceWithTax) => {
      const rendered = renderHook((props) => useInitializeBfCheckout(props), { initialProps: propsFor(price) });

      await waitFor(() => {
        expect(rendered.result.current.stripeElementsOptions?.amount).toBe(1210);
      });

      return rendered;
    };

    test.each<[string, PriceWithTax, number]>([
      ['changes because a coupon is applied', mockPriceWithTax, 605],
      ['is zero because a 100% OFF coupon was applied to a subscription', mockPriceWithTax, 0],
      ['is exactly the Stripe minimum charge', mockPriceWithTax, 50],
    ])(
      'When the price amount with tax %s, then the Stripe elements amount is updated without reloading the elements',
      async (_, price, amountWithTax) => {
        const { result, rerender } = await renderWithInitialAmount(price);

        rerender(propsFor(price, amountWithTax));

        await waitFor(() => {
          expect(result.current.stripeElementsOptions?.amount).toBe(amountWithTax);
        });
        expect(checkoutService.loadStripeElements).toHaveBeenCalledTimes(1);
      },
    );

    test.each<[string, PriceWithTax, number]>([
      ['zero, because a 100% OFF coupon was applied to a lifetime plan', mockLifetimePriceWithTax, 0],
      ['below the Stripe minimum charge', mockPriceWithTax, 49],
    ])(
      'When the price amount with tax is %s, then the Stripe elements amount is not updated',
      async (_, price, amountWithTax) => {
        const { result, rerender } = await renderWithInitialAmount(price);

        rerender(propsFor(price, amountWithTax));

        await waitFor(() => {
          expect(result.current.stripeElementsOptions?.amount).toBe(1210);
        });
      },
    );
  });

  describe('Crypto payments', () => {
    test.each<[string, PriceWithTax]>([
      ['a subscription', mockPriceWithTax],
      ['a lifetime plan', mockLifetimePriceWithTax],
    ])('When the plan is %s, then crypto currencies are never fetched', async (_, price) => {
      const { result } = renderHook(() => useInitializeBfCheckout({ price, translate: mockTranslate }));

      await waitFor(() => {
        expect(result.current.isCheckoutReady).toBe(true);
      });
      expect(currencyService.getAvailableCryptoCurrencies).not.toHaveBeenCalled();
    });
  });

  describe('Business plan restriction', () => {
    const mockBusinessPriceWithTax: PriceWithTax = {
      ...mockPriceWithTax,
      price: {
        ...mockPriceWithTax.price,
        type: UserType.Business,
      },
    };

    test('When the selected plan is a business plan, then a warning notification is shown', async () => {
      renderHook(() => useInitializeBfCheckout({ price: mockBusinessPriceWithTax, translate: mockTranslate }));

      await waitFor(() => {
        expect(notificationsService.show).toHaveBeenCalledWith({
          text: 'checkout.error.businessPlan',
          type: ToastType.Warning,
        });
      });
    });

    test('When the selected plan is a business plan and the user is not logged in, then the user is redirected to the signup page', async () => {
      renderHook(() => useInitializeBfCheckout({ price: mockBusinessPriceWithTax, translate: mockTranslate }));

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Signup);
      });
    });

    test('When the selected plan is a business plan and the user is logged in, then the user is redirected to the drive page', async () => {
      renderHook(() =>
        useInitializeBfCheckout({ price: mockBusinessPriceWithTax, user: mockUser, translate: mockTranslate }),
      );

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive);
      });
    });

    test('When the selected plan is a business plan, then the checkout never becomes ready', async () => {
      const { result } = renderHook(() =>
        useInitializeBfCheckout({ price: mockBusinessPriceWithTax, translate: mockTranslate }),
      );

      await waitFor(() => {
        expect(navigationService.push).toHaveBeenCalled();
      });
      expect(result.current.isCheckoutReady).toBe(false);
      expect(checkoutService.loadStripeElements).not.toHaveBeenCalled();
    });
  });

  describe('Checkout ready state', () => {
    test('When all initialization is complete, then the checkout is ready', async () => {
      const { result } = renderHook(() =>
        useInitializeBfCheckout({ price: mockPriceWithTax, translate: mockTranslate }),
      );

      await waitFor(() => {
        expect(result.current.isCheckoutReady).toBe(true);
      });
    });

    test('When hook is initialized without price, then the checkout is not ready', async () => {
      const { result } = renderHook(() => useInitializeBfCheckout({ translate: mockTranslate }));

      await waitFor(() => {
        expect(result.current.stripeSdk).toBeDefined();
      });
      expect(result.current.isCheckoutReady).toBe(false);
    });
  });

  describe('Hook return values', () => {
    test('When the hook is initialized, then it returns all expected values', async () => {
      const { result } = renderHook(() =>
        useInitializeBfCheckout({ price: mockPriceWithTax, translate: mockTranslate }),
      );

      await waitFor(() => {
        expect(result.current.isCheckoutReady).toBe(true);
      });

      expect(result.current).toHaveProperty('stripeSdk');
      expect(result.current).toHaveProperty('stripeElementsOptions');
      expect(result.current).toHaveProperty('isCheckoutReady');
    });
  });
});
