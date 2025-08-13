import { describe, expect, test, vi } from 'vitest';
import { useUserPayment } from './useUserPayment';
import paymentService from '../services/payment.service';
import checkoutService from '../services/checkout.service';
import localStorageService from 'app/core/services/local-storage.service';
import envService from 'app/core/services/env.service';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { ProcessPurchasePayload, UseUserPaymentPayload } from '../types';
import notificationsService from 'app/notifications/services/notifications.service';

describe('Custom hook to handle payments', () => {
  describe('Get subscription data to do the payment', () => {
    test('When the user wants to purchase a subscription, then a normal subscription is created', async () => {
      const createNormalSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'payment_intent_id',
        subscriptionId: 'subscription_id',
      });
      const createSubscriptionWithTrialSpy = vi.spyOn(paymentService, 'createSubscriptionWithTrial');

      const { getSubscriptionPaymentIntent } = useUserPayment();

      const subscriptionPaymentIntentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        token: 'token',

        currency: 'currency',
        seatsForBusinessSubscription: 1,
        promoCodeId: 'promo_code_id',
      };

      const response = await getSubscriptionPaymentIntent(subscriptionPaymentIntentPayload);

      expect(createNormalSubscriptionSpy).toHaveBeenCalledWith({
        customerId: subscriptionPaymentIntentPayload.customerId,
        priceId: subscriptionPaymentIntentPayload.priceId,
        token: subscriptionPaymentIntentPayload.token,
        currency: subscriptionPaymentIntentPayload.currency,
        promoCodeId: subscriptionPaymentIntentPayload.promoCodeId,
        quantity: subscriptionPaymentIntentPayload.seatsForBusinessSubscription,
      });
      expect(response).toStrictEqual({
        type: 'payment',
        clientSecret: 'client_secret',
        subscriptionId: 'subscription_id',
        paymentIntentId: 'payment_intent_id',
      });
      expect(createSubscriptionWithTrialSpy).not.toHaveBeenCalled();
    });
  });

  describe('Get lifetime data to do the payment', () => {
    test('When the user attempts to purchase a lifetime plan, then the necessary data to purchase the plan are returned', async () => {
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        id: 'payment_intent_id',
      });
      const { getLifetimePaymentIntent } = useUserPayment();

      const lifetimePaymentIntentPayload = {
        customerId: 'customer_id',
        priceId: 'price_id',
        currency: 'currency',
        token: 'token',
        promoCodeId: 'promo_code_id',
      };

      const response = await getLifetimePaymentIntent(lifetimePaymentIntentPayload);

      expect(response).toStrictEqual({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        paymentIntentId: 'payment_intent_id',
      });
      expect(createPaymentIntentSpy).toHaveBeenCalledWith({
        customerId: lifetimePaymentIntentPayload.customerId,
        priceId: lifetimePaymentIntentPayload.priceId,
        currency: lifetimePaymentIntentPayload.currency,
        token: lifetimePaymentIntentPayload.token,
        promoCodeId: lifetimePaymentIntentPayload.promoCodeId,
      });
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
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
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
            interval: 'year',
            type: UserType.Individual,
          },
        } as any,
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
      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      });
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
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
      const createSubscriptionSpy = vi.spyOn(checkoutService, 'createSubscription').mockResolvedValue({
        clientSecret: 'client_secret',
        type: 'payment',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_123',
      });
      const createPaymentIntentSpy = vi.spyOn(checkoutService, 'createPaymentIntent').mockResolvedValue({
        clientSecret: 'client_secret',
        invoiceStatus: 'open',
        id: 'pi_123',
      });
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
