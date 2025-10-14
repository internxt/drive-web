// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useUserPayment } from './useUserPayment';
import checkoutService from '../services/checkout.service';
import localStorageService from '../../core/services/local-storage.service';
import envService from '../../core/services/env.service';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import navigationService from '../../core/services/navigation.service';
import { AppView } from '../../core/types';
import { PaymentType, ProcessPurchasePayload, UseUserPaymentPayload } from '../types';
import notificationsService from '../../notifications/services/notifications.service';

const mockHostname = 'https://hostname.com';

describe('Custom hook to handle payments', () => {
  beforeEach(() => {
    vi.doUnmock('@internxt/sdk');
    vi.doUnmock('../../core/factory/sdk');
    vi.doUnmock('./payment.service');
    vi.doUnmock('../../utils/userLocation');
    vi.doUnmock('../../drive/services/file.service');

    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'hostname') return mockHostname;
      else return 'no mock implementation';
    });
  });

  describe('Get subscription data to do the payment', () => {
    test('When creating a new subscription, then it is created successfully', async () => {
      const createNormalSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'payment_intent_id',
        subscriptionId: 'subscription_id',
      });

      const { getSubscriptionPaymentIntent } = useUserPayment();

      const subscriptionPaymentIntentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        currency: 'eur',
        captchaToken: 'captcha_token',
        promoCodeId: 'promo_code_id',
        seatsForBusinessSubscription: 1,
      };

      const response = await getSubscriptionPaymentIntent(subscriptionPaymentIntentPayload);

      expect(createNormalSubscriptionSpy).toHaveBeenCalledWith({
        customerId: subscriptionPaymentIntentPayload.customerId,
        priceId: subscriptionPaymentIntentPayload.priceId,
        token: subscriptionPaymentIntentPayload.token,
        currency: subscriptionPaymentIntentPayload.currency,
        promoCodeId: subscriptionPaymentIntentPayload.promoCodeId,
        captchaToken: subscriptionPaymentIntentPayload.captchaToken,
        quantity: subscriptionPaymentIntentPayload.seatsForBusinessSubscription,
      });
      expect(response).toStrictEqual({
        type: 'payment',
        clientSecret: 'client_secret',
        subscriptionId: 'subscription_id',
        paymentIntentId: 'payment_intent_id',
      });
    });
  });

  describe('Get lifetime data to do the payment', () => {
    test('When the user attempts to purchase a lifetime plan, then the necessary data to purchase the plan are returned', async () => {
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        type: 'fiat',
        id: 'payment_intent_id',
      });
      const { getLifetimePaymentIntent } = useUserPayment();

      const lifetimePaymentIntentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        currency: 'currency',
        token: 'token',
        promoCodeId: 'promo_code_id',
        captchaToken: 'captcha_token',
      };

      const response = await getLifetimePaymentIntent(lifetimePaymentIntentPayload);

      expect(response).toStrictEqual({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        type: 'fiat',
        id: 'payment_intent_id',
      });
      expect(createPaymentIntentSpy).toHaveBeenCalledWith(lifetimePaymentIntentPayload);
    });

    test('When the user attempts to purchase a lifetime plan using crypto currencies, then the necessary data to purchase the plan are returned', async () => {
      const { getLifetimePaymentIntent } = useUserPayment();

      const lifetimePaymentIntentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        currency: 'BTC',
        token: 'encoded-customer-id',
        promoCodeId: 'promo_code_id',
        captchaToken: 'captcha_token',
      };
      const paymentIntentResponse = {
        type: PaymentType['CRYPTO'] as const,
        id: 'payment_intent_id',
        token: 'encoded-invoice-id',
        payload: {
          payAmount: 1,
          payCurrency: 'BTC',
          paymentAddress: '0xB112c1820D41A6A0665932D7341f2344802F7bD8',
          paymentRequestUri: 'ethereum:0xB112c1820D41A6A0665932D7341f2344802F7bD8@1?value=271867590000000000',
          qrUrl: 'https://qrUrl.example.com',
          url: 'https://invoice.url.com',
        },
      };

      const createPaymentIntentSpy = vi
        .spyOn(checkoutService, 'createPaymentIntent')
        .mockResolvedValue(paymentIntentResponse);

      const response = await getLifetimePaymentIntent(lifetimePaymentIntentPayload);

      expect(response).toStrictEqual({
        id: 'payment_intent_id',
        type: 'crypto',
        encodedInvoiceIdToken: 'encoded-invoice-id',
        payload: {
          ...paymentIntentResponse.payload,
        },
      });
      expect(createPaymentIntentSpy).toHaveBeenCalledWith(lifetimePaymentIntentPayload);
    });
  });

  describe('Handle Subscription Payment', () => {
    test('When the user attempts to purchase a subscription with 100% OFF, then the setup of the payment method is done, the sub is created and the user confirms the payment', async () => {
      const { handleSubscriptionPayment } = useUserPayment();

      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'setup',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      });
      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      const setupIntent = vi.fn().mockResolvedValue({ error: undefined });
      const translate = vi.fn().mockImplementation(() => {});
      // Spy for savePaymentDataInLocalStorage function
      const localStorageServiceSpy = vi.spyOn(localStorageService, 'set').mockImplementation(() => {});

      const subscriptionPaymentPayload: ProcessPurchasePayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        currency: 'currency',
        seatsForBusinessSubscription: 1,
        elements: vi.fn() as any,
        currentSelectedPlan: {
          price: {
            interval: 'year',
            type: UserType.Individual,
          },
        } as any,
        captchaToken: 'captcha_token',
        confirmPayment,
        confirmSetupIntent: setupIntent,
        translate: translate,
      };

      await handleSubscriptionPayment(subscriptionPaymentPayload);

      expect(createSubscriptionSpy).toHaveBeenCalledWith({
        customerId: subscriptionPaymentPayload.customerId,
        priceId: subscriptionPaymentPayload.priceId,
        token: subscriptionPaymentPayload.token,
        currency: subscriptionPaymentPayload.currency,
        promoCodeId: undefined,
        quantity: subscriptionPaymentPayload.seatsForBusinessSubscription,
        captchaToken: subscriptionPaymentPayload.captchaToken,
      });

      expect(localStorageServiceSpy).toHaveBeenCalledTimes(5);

      expect(setupIntent).toHaveBeenCalledWith({
        elements: subscriptionPaymentPayload.elements,
        clientSecret: 'client_secret',
        confirmParams: {
          return_url: `${envService.getVariable('hostname')}/checkout/success`,
        },
      });
    });

    test('When the user attempts to purchase a subscription, then the subscription is created, the necessary data is stored and the user confirms the payment', async () => {
      const { handleSubscriptionPayment } = useUserPayment();

      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      });
      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      const setupIntent = vi.fn().mockResolvedValue({ error: undefined });
      const translate = vi.fn().mockImplementation(() => {});
      // Spy for savePaymentDataInLocalStorage function
      const localStorageServiceSpy = vi.spyOn(localStorageService, 'set').mockImplementation(() => {});

      const subscriptionPaymentPayload: ProcessPurchasePayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        currency: 'currency',
        seatsForBusinessSubscription: 1,
        elements: vi.fn() as any,
        currentSelectedPlan: {
          price: {
            interval: 'year',
            type: UserType.Individual,
          },
        } as any,
        captchaToken: 'captcha_token',
        confirmPayment,
        confirmSetupIntent: setupIntent,
        translate: translate,
      };

      await handleSubscriptionPayment(subscriptionPaymentPayload);

      expect(createSubscriptionSpy).toHaveBeenCalledWith({
        customerId: subscriptionPaymentPayload.customerId,
        priceId: subscriptionPaymentPayload.priceId,
        token: subscriptionPaymentPayload.token,
        currency: subscriptionPaymentPayload.currency,
        promoCodeId: undefined,
        quantity: subscriptionPaymentPayload.seatsForBusinessSubscription,
        captchaToken: subscriptionPaymentPayload.captchaToken,
      });

      expect(localStorageServiceSpy).toHaveBeenCalledTimes(5);

      expect(confirmPayment).toHaveBeenCalledWith({
        elements: subscriptionPaymentPayload.elements,
        clientSecret: 'client_secret',
        confirmParams: {
          return_url: `${envService.getVariable('hostname')}/checkout/success`,
        },
      });
    });

    test('When the user attempts to purchase a subscription which has a type different from payment or setup, then a toast notification is displayed indicating something went wrong', async () => {
      const { handleSubscriptionPayment } = useUserPayment();

      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'object-storage',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      } as any);
      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      const setupIntent = vi.fn().mockResolvedValue({ error: undefined });
      const translate = vi.fn().mockImplementation(() => {});
      // Spy for savePaymentDataInLocalStorage function
      const localStorageServiceSpy = vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
      const notificationsServiceSpy = vi.spyOn(notificationsService, 'show').mockImplementation(() => '');

      const subscriptionPaymentPayload: ProcessPurchasePayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        currency: 'currency',
        seatsForBusinessSubscription: 1,
        elements: vi.fn() as any,
        currentSelectedPlan: {
          price: {
            interval: 'year',
            type: UserType.Individual,
          },
        } as any,
        captchaToken: 'captcha_token',
        confirmPayment,
        confirmSetupIntent: setupIntent,
        translate: translate,
      };

      await handleSubscriptionPayment(subscriptionPaymentPayload);

      expect(createSubscriptionSpy).toHaveBeenCalledWith({
        customerId: subscriptionPaymentPayload.customerId,
        priceId: subscriptionPaymentPayload.priceId,
        token: subscriptionPaymentPayload.token,
        currency: subscriptionPaymentPayload.currency,
        promoCodeId: undefined,
        quantity: subscriptionPaymentPayload.seatsForBusinessSubscription,
        captchaToken: subscriptionPaymentPayload.captchaToken,
      });

      expect(localStorageServiceSpy).toHaveBeenCalledTimes(5);

      expect(notificationsServiceSpy).toHaveBeenCalled();
      expect(confirmPayment).not.toHaveBeenCalled();
      expect(setupIntent).not.toHaveBeenCalled();
    });
  });

  describe('Handle Lifetime Payment', () => {
    test('When the user attempts to purchase a lifetime plan, then the invoice is created, the necessary data is stored and the user confirms the payment', async () => {
      const { handleLifetimePayment } = useUserPayment();

      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        type: 'fiat',
        id: 'pi_123',
      });
      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      // Spy for savePaymentDataInLocalStorage function
      const localStorageServiceSpy = vi.spyOn(localStorageService, 'set').mockImplementation(() => {});

      const lifetimePaymentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        currency: 'currency',
        elements: {
          confirmPayment: vi.fn(),
        },
        currentSelectedPlan: {
          price: {
            interval: 'lifetime',
            type: UserType.Individual,
          },
        },
        confirmPayment,
      };

      await handleLifetimePayment(lifetimePaymentPayload as any);

      expect(createPaymentIntentSpy).toHaveBeenCalledWith({
        customerId: lifetimePaymentPayload.customerId,
        priceId: lifetimePaymentPayload.priceId,
        token: lifetimePaymentPayload.token,
        currency: lifetimePaymentPayload.currency,
        promoCodeId: undefined,
      });

      expect(localStorageServiceSpy).toHaveBeenCalledTimes(5);

      expect(confirmPayment).toHaveBeenCalledWith({
        elements: lifetimePaymentPayload.elements,
        clientSecret: 'client_secret',
        confirmParams: {
          return_url: `${envService.getVariable('hostname')}/checkout/success`,
        },
      });
    });

    test('when the status of the invoice is already paid, then the user is directly redirected to the Success page without attempting to confirm the payment', async () => {
      const { handleLifetimePayment } = useUserPayment();

      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'paid',
        type: 'fiat',
        id: 'pi_123',
      });
      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      // Spy for savePaymentDataInLocalStorage function
      const localStorageServiceSpy = vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
      const navigationServiceSpy = vi.spyOn(navigationService, 'push').mockImplementation(() => {});

      const lifetimePaymentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        currency: 'currency',
        elements: {
          confirmPayment: vi.fn(),
        },
        currentSelectedPlan: {
          price: {
            interval: 'lifetime',
            type: UserType.Individual,
          },
        },
        confirmPayment,
      };

      await handleLifetimePayment(lifetimePaymentPayload as any);

      expect(createPaymentIntentSpy).toHaveBeenCalledWith({
        customerId: lifetimePaymentPayload.customerId,
        priceId: lifetimePaymentPayload.priceId,
        token: lifetimePaymentPayload.token,
        currency: lifetimePaymentPayload.currency,
        promoCodeId: undefined,
      });

      expect(localStorageServiceSpy).toHaveBeenCalledTimes(5);
      expect(navigationServiceSpy).toHaveBeenCalledWith(AppView.CheckoutSuccess);

      expect(confirmPayment).not.toHaveBeenCalled();
    });
  });

  describe('Handling user payment', () => {
    test('When the plan is a subscription, then the subscription handler is called', async () => {
      const payment = useUserPayment();

      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      const setupIntent = vi.fn().mockResolvedValue({ error: undefined });
      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      });
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent');
      // Spy for savePaymentDataInLocalStorage function
      vi.spyOn(localStorageService, 'set').mockImplementation(() => {});

      const subscriptionPaymentPayload: UseUserPaymentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        translate: vi.fn(),
        currency: 'currency',
        seatsForBusinessSubscription: 1,
        elements: {
          create: vi.fn(),
          fetchUpdates: vi.fn(),
          getElement: vi.fn(),
          submit: vi.fn(),
          update: vi.fn(),
        },
        selectedPlan: {
          price: {
            interval: 'year',
            type: UserType.Individual,
          },
        } as any,
        captchaToken: 'captcha_token',
        confirmPayment,
        confirmSetupIntent: setupIntent,
        gclidStored: null,
      };

      await payment.handleUserPayment(subscriptionPaymentPayload);

      expect(createSubscriptionSpy).toHaveBeenCalled();
      expect(createPaymentIntentSpy).not.toHaveBeenCalled();
    });

    test('When the plan is a lifetime, then the lifetime handler is created', async () => {
      const payment = useUserPayment();

      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      const setupIntent = vi.fn().mockResolvedValue({ error: undefined });
      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription');
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        type: 'fiat',
        id: 'pi_123',
      });
      // Spy for savePaymentDataInLocalStorage function
      vi.spyOn(localStorageService, 'set').mockImplementation(() => {});

      const subscriptionPaymentPayload: UseUserPaymentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        translate: vi.fn(),
        currency: 'currency',
        seatsForBusinessSubscription: 1,
        elements: {
          create: vi.fn(),
          fetchUpdates: vi.fn(),
          getElement: vi.fn(),
          submit: vi.fn(),
          update: vi.fn(),
        },
        selectedPlan: {
          price: {
            interval: 'lifetime',
            type: UserType.Individual,
          },
        } as any,
        captchaToken: 'captcha_token',
        confirmPayment,
        confirmSetupIntent: setupIntent,
        gclidStored: null,
      };

      await payment.handleUserPayment(subscriptionPaymentPayload);

      expect(createSubscriptionSpy).not.toHaveBeenCalled();
      expect(createPaymentIntentSpy).toHaveBeenCalled();
    });

    test('When the plan is neither a subscription nor a lifetime, then the user is redirected to the Drive page directly', async () => {
      const payment = useUserPayment();

      const confirmPayment = vi.fn().mockResolvedValue({ error: undefined });
      const setupIntent = vi.fn().mockResolvedValue({ error: undefined });
      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription');
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent');
      // Spy for savePaymentDataInLocalStorage function
      vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
      const navigationServiceSpy = vi.spyOn(navigationService, 'push').mockImplementation(() => {});

      const subscriptionPaymentPayload: UseUserPaymentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',
        translate: vi.fn(),
        currency: 'currency',
        seatsForBusinessSubscription: 1,
        elements: {
          create: vi.fn(),
          fetchUpdates: vi.fn(),
          getElement: vi.fn(),
          submit: vi.fn(),
          update: vi.fn(),
        },
        selectedPlan: {
          price: {
            interval: 'object-storage',
            type: UserType.Individual,
          },
        } as any,
        captchaToken: 'captcha_token',
        confirmPayment,
        confirmSetupIntent: setupIntent,
        gclidStored: null,
      };

      await payment.handleUserPayment(subscriptionPaymentPayload);

      expect(createSubscriptionSpy).not.toHaveBeenCalled();
      expect(createPaymentIntentSpy).not.toHaveBeenCalled();
      expect(navigationServiceSpy).toHaveBeenCalledWith(AppView.Drive);
    });
  });
});
