import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useUserPayment } from './useUserPayment';
import checkoutService from '../services/checkout.service';
import localStorageService from 'services/local-storage.service';
import envService from 'services/env.service';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';

const mockHostname = 'https://hostname.com';

const createMockPlan = (interval: string): PriceWithTax =>
  ({
    price: {
      id: 'price_123',
      interval,
      type: UserType.Individual,
      currency: 'eur',
      amount: 1000,
      decimalAmount: 10,
      bytes: 1099511627776,
    },
    taxes: {
      tax: 210,
      decimalTax: 2.1,
      amountWithTax: 1210,
      decimalAmountWithTax: 12.1,
    },
  }) as PriceWithTax;

const createBasePayload = (plan: PriceWithTax) => ({
  customerId: 'customer_id',
  priceId: 'price_id',
  token: 'token',
  translate: vi.fn(),
  currency: 'eur',
  seatsForBusinessSubscription: 1,
  elements: {
    create: vi.fn(),
    fetchUpdates: vi.fn(),
    getElement: vi.fn(),
    submit: vi.fn(),
    update: vi.fn(),
  } as any,
  selectedPlan: plan,
  captchaToken: 'captcha_token',
  userAddress: '1.1.1.1',
  confirmPayment: vi.fn().mockResolvedValue({ error: undefined }),
  confirmSetupIntent: vi.fn().mockResolvedValue({ error: undefined }),
});

describe('useUserPayment hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'hostname') return mockHostname;
      return 'no mock implementation';
    });
    vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
  });

  describe('handleUserPayment', () => {
    test('When the plan is a yearly subscription, then the subscription service is called', async () => {
      const { handleUserPayment } = useUserPayment();

      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      });
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent');

      const yearlyPlan = createMockPlan('year');
      const payload = createBasePayload(yearlyPlan);

      await handleUserPayment(payload);

      expect(createSubscriptionSpy).toHaveBeenCalled();
      expect(createPaymentIntentSpy).not.toHaveBeenCalled();
    });

    test('When the plan is a monthly subscription, then the subscription service is called', async () => {
      const { handleUserPayment } = useUserPayment();

      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      });
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent');

      const monthlyPlan = createMockPlan('month');
      const payload = createBasePayload(monthlyPlan);

      await handleUserPayment(payload);

      expect(createSubscriptionSpy).toHaveBeenCalled();
      expect(createPaymentIntentSpy).not.toHaveBeenCalled();
    });

    test('When the plan is a lifetime, then the payment intent service is called', async () => {
      const { handleUserPayment } = useUserPayment();

      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription');
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        type: 'fiat',
        id: 'pi_123',
      });

      const lifetimePlan = createMockPlan('lifetime');
      const payload = createBasePayload(lifetimePlan);

      await handleUserPayment(payload);

      expect(createSubscriptionSpy).not.toHaveBeenCalled();
      expect(createPaymentIntentSpy).toHaveBeenCalled();
    });

    test('When the plan interval is unknown, then the user is redirected to Drive', async () => {
      const { handleUserPayment } = useUserPayment();

      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription');
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent');
      const navigationServiceSpy = vi.spyOn(navigationService, 'push').mockImplementation(() => {});

      const unknownPlan = createMockPlan('unknown-interval');
      const payload = createBasePayload(unknownPlan);

      await handleUserPayment(payload);

      expect(createSubscriptionSpy).not.toHaveBeenCalled();
      expect(createPaymentIntentSpy).not.toHaveBeenCalled();
      expect(navigationServiceSpy).toHaveBeenCalledWith(AppView.Drive);
    });
  });
});
