import { describe, it, expect, vi, beforeEach, test } from 'vitest';
import { loadStripe } from '@stripe/stripe-js/pure';
import paymentService from './payment.service';
import { SdkFactory } from '../../../app/core/factory/sdk';
import { envService } from 'services';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

vi.mock('@stripe/stripe-js/pure');
vi.mock('axios');

describe('paymentService', () => {
  const mockPaymentsClient = {
    createCustomer: vi.fn(),
    createSubscription: vi.fn(),
    createPaymentIntent: vi.fn(),
    createSession: vi.fn(),
    getSetupIntent: vi.fn(),
    getDefaultPaymentMethod: vi.fn(),
    getInvoices: vi.fn(),
    getUserSubscription: vi.fn(),
    getPrices: vi.fn(),
    isCouponUsedByUser: vi.fn(),
    getPromoCodesUsedByUser: vi.fn(),
    requestPreventCancellation: vi.fn(),
    preventCancellation: vi.fn(),
    applyRedeemCode: vi.fn(),
    updateSubscriptionPrice: vi.fn(),
    updateWorkspaceMembers: vi.fn(),
    cancelSubscription: vi.fn(),
    updateCustomerBillingInfo: vi.fn(),
    applyCancellationTrial: vi.fn(),
  };

  const mockStripe = {
    redirectToCheckout: vi.fn(),
    confirmCardPayment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createPaymentsClient: vi.fn().mockResolvedValue(mockPaymentsClient),
    } as any);
    vi.mocked(loadStripe).mockResolvedValue(mockStripe as any);
  });

  describe('getStripe', () => {
    it('loads Stripe payment system with correct credentials', async () => {
      vi.spyOn(envService, 'isProduction').mockReturnValue(true);
      vi.spyOn(envService, 'getVariable').mockReturnValue('pk_live_test');

      const stripe = await paymentService.getStripe();

      expect(loadStripe).toHaveBeenCalledWith('pk_live_test');
      expect(stripe).toBe(mockStripe);
    });
  });

  describe('Update subscription', () => {
    test('When upgrading to a plan with coupon, then it should be applied and the plan updated', async () => {
      mockPaymentsClient.updateSubscriptionPrice.mockResolvedValue({
        userSubscription: { id: 'sub_123' },
        request3DSecure: false,
        clientSecret: 'cs_123',
      });

      await paymentService.updateSubscriptionPrice({
        priceId: 'price_123',
        coupon: 'DISCOUNT',
        userType: UserType.Individual,
      });

      expect(mockPaymentsClient.updateSubscriptionPrice).toHaveBeenCalledWith({
        priceId: 'price_123',
        couponCode: 'DISCOUNT',
        userType: UserType.Individual,
      });
    });
  });

  describe('Update subscription with confirmation', () => {
    test('When the user updates the subscription with confirmation, the 3DS is requested and checked', async () => {
      const updateSubscriptionPricePayload = {
        userSubscription: { id: 'sub_123' },
        request3DSecure: true,
        clientSecret: 'cs_123',
      };

      mockPaymentsClient.updateSubscriptionPrice.mockResolvedValue(updateSubscriptionPricePayload);
      mockStripe.confirmCardPayment.mockResolvedValue({ paymentIntent: { status: 'succeeded' } });
      const onSuccessCallback = vi.fn();

      await paymentService.updateSubscriptionWithConfirmation({
        priceId: 'price_123',
        userType: UserType.Individual,
        coupon: 'DISCOUNT',
        onSuccess: onSuccessCallback,
        onError: vi.fn(),
      });

      expect(mockPaymentsClient.updateSubscriptionPrice).toHaveBeenCalledWith({
        priceId: 'price_123',
        couponCode: 'DISCOUNT',
        userType: UserType.Individual,
      });
      expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(updateSubscriptionPricePayload.clientSecret);
      expect(onSuccessCallback).toHaveBeenCalled();
    });

    test('When the user updates the subscription and there is an error with the confirmation, then the error is handled correctly', async () => {
      const updateSubscriptionPricePayload = {
        userSubscription: { id: 'sub_123' },
        request3DSecure: true,
        clientSecret: 'cs_123',
      };
      const mockedMessageError = 'Error updating price';

      mockPaymentsClient.updateSubscriptionPrice.mockResolvedValue(updateSubscriptionPricePayload);
      mockStripe.confirmCardPayment.mockResolvedValue({ error: { message: mockedMessageError } });
      const onErrorCallback = vi.fn();

      await paymentService.updateSubscriptionWithConfirmation({
        priceId: 'price_123',
        userType: UserType.Individual,
        coupon: 'DISCOUNT',
        onSuccess: vi.fn(),
        onError: onErrorCallback,
      });

      expect(mockPaymentsClient.updateSubscriptionPrice).toHaveBeenCalledWith({
        priceId: 'price_123',
        couponCode: 'DISCOUNT',
        userType: UserType.Individual,
      });
      expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(updateSubscriptionPricePayload.clientSecret);
      expect(onErrorCallback).toHaveBeenCalledWith(new Error(mockedMessageError));
    });
  });

  describe('Cancelling subscription', () => {
    test('When cancelling the subscription, then stops the ongoing individual subscription', async () => {
      mockPaymentsClient.cancelSubscription.mockResolvedValue(undefined);

      await paymentService.cancelSubscription(UserType.Individual);

      expect(mockPaymentsClient.cancelSubscription).toHaveBeenCalledWith(UserType.Individual);
    });
  });

  describe('Get the user subscription', () => {
    test('When fetching the individual user subscription, then gets current subscription information', async () => {
      const mockSubscription = {
        id: 'sub_123',
        type: 'subscription',
        status: 'active',
      };
      mockPaymentsClient.getUserSubscription.mockResolvedValue(mockSubscription as any);

      const result = await paymentService.getUserSubscription(UserType.Individual);

      expect(mockPaymentsClient.getUserSubscription).toHaveBeenCalledWith(UserType.Individual);
      expect(result).toEqual(mockSubscription);
    });

    test('When fetching a subscription without specifying account type, then gets individual subscription details', async () => {
      const mockSubscription = {
        id: 'sub_456',
        type: 'subscription',
        status: 'active',
      };
      mockPaymentsClient.getUserSubscription.mockResolvedValue(mockSubscription as any);

      const result = await paymentService.getUserSubscription();

      expect(mockPaymentsClient.getUserSubscription).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('Get prices', () => {
    test('When fetching prices, then shows available plan prices for selected currency and account type', async () => {
      const mockPrices = [
        { id: 'price_1', amount: 999, currency: 'eur' },
        { id: 'price_2', amount: 1999, currency: 'eur' },
      ];
      mockPaymentsClient.getPrices.mockResolvedValue(mockPrices as any);

      const result = await paymentService.getPrices('eur', UserType.Individual);

      expect(mockPaymentsClient.getPrices).toHaveBeenCalledWith('eur', UserType.Individual);
      expect(result).toEqual(mockPrices);
    });

    test('When fetching prices without specifying currency and type, then shows default pricing options', async () => {
      const mockPrices = [{ id: 'price_3', amount: 1299, currency: 'usd' }];
      mockPaymentsClient.getPrices.mockResolvedValue(mockPrices as any);

      const result = await paymentService.getPrices();

      expect(mockPaymentsClient.getPrices).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockPrices);
    });
  });

  describe('Applying cancellation trial', () => {
    test('When applying the cancellation trial, then it should resolve correctly', async () => {
      mockPaymentsClient.applyCancellationTrial.mockResolvedValue(undefined);

      await expect(paymentService.applyCancellationTrial('sub-123')).resolves.not.toThrow();
    });
  });
});
