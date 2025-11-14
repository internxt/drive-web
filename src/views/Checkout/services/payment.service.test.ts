import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadStripe } from '@stripe/stripe-js/pure';
import paymentService from './payment.service';
import { SdkFactory } from '../../../app/core/factory/sdk';
import envService from '../../../app/core/services/env.service';
import localStorageService from '../../../app/core/services/local-storage.service';
import axios from 'axios';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { StripeSessionMode } from '../types';

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
  };

  const mockStripe = {
    redirectToCheckout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createPaymentsClient: vi.fn().mockResolvedValue(mockPaymentsClient),
    } as any);
    vi.mocked(loadStripe).mockResolvedValue(mockStripe as any);
  });

  describe('getStripe', () => {
    it('initializes Stripe with production key', async () => {
      vi.spyOn(envService, 'isProduction').mockReturnValue(true);
      vi.spyOn(envService, 'getVariable').mockReturnValue('pk_live_test');

      const stripe = await paymentService.getStripe();

      expect(loadStripe).toHaveBeenCalledWith('pk_live_test');
      expect(stripe).toBe(mockStripe);
    });
  });

  describe('getCustomerId', () => {
    it('returns customer ID and token', async () => {
      const mockResponse = { customerId: 'cus_123', token: 'tok_123' };
      mockPaymentsClient.createCustomer.mockResolvedValue(mockResponse);

      const result = await paymentService.getCustomerId('John Doe', 'john@example.com', 'US', 'VAT123');

      expect(mockPaymentsClient.createCustomer).toHaveBeenCalledWith('John Doe', 'john@example.com', 'US', 'VAT123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createSubscription', () => {
    it('creates subscription with promo code and seats', async () => {
      const mockResponse = { clientSecret: 'cs_123', subscriptionId: 'sub_123' };
      mockPaymentsClient.createSubscription.mockResolvedValue(mockResponse);

      const result = await paymentService.createSubscription('cus_123', 'price_123', 'tok_123', 'usd', 'PROMO10', 2);

      expect(mockPaymentsClient.createSubscription).toHaveBeenCalledWith(
        'cus_123',
        'price_123',
        'tok_123',
        2,
        'usd',
        'PROMO10',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createPaymentIntent', () => {
    it('creates payment intent for plan', async () => {
      const mockResponse = { clientSecret: 'cs_123', id: 'pi_123' };
      mockPaymentsClient.createPaymentIntent.mockResolvedValue(mockResponse);

      const result = await paymentService.createPaymentIntent('cus_123', 1000, 'plan_123', 'tok_123', 'usd', 'PROMO');

      expect(mockPaymentsClient.createPaymentIntent).toHaveBeenCalledWith(
        'cus_123',
        1000,
        'plan_123',
        'tok_123',
        'usd',
        'PROMO',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createSession', () => {
    it('creates checkout session', async () => {
      const payload = { mode: 'subscription' as StripeSessionMode, priceId: 'price_123' };
      const mockResponse = { id: 'cs_123' };
      mockPaymentsClient.createSession.mockResolvedValue(mockResponse);

      const result = await paymentService.createSession(payload);

      expect(mockPaymentsClient.createSession).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateSubscriptionPrice', () => {
    it('changes plan with discount applied', async () => {
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

  describe('cancelSubscription', () => {
    it('terminates active subscription', async () => {
      mockPaymentsClient.cancelSubscription.mockResolvedValue(undefined);

      await paymentService.cancelSubscription(UserType.Individual);

      expect(mockPaymentsClient.cancelSubscription).toHaveBeenCalledWith(UserType.Individual);
    });
  });

  describe('requestPreventCancellation', () => {
    it('checks eligibility for retention offer', async () => {
      mockPaymentsClient.requestPreventCancellation.mockResolvedValue({ elegible: true });

      const result = await paymentService.requestPreventCancellation();

      expect(mockPaymentsClient.requestPreventCancellation).toHaveBeenCalled();
      expect(result.elegible).toBe(true);
    });
  });

  describe('getUserSubscription', () => {
    it('retrieves individual user subscription details', async () => {
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

    it('retrieves subscription without specifying user type', async () => {
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

  describe('getPrices', () => {
    it('fetches prices for specific currency and user type', async () => {
      const mockPrices = [
        { id: 'price_1', amount: 999, currency: 'eur' },
        { id: 'price_2', amount: 1999, currency: 'eur' },
      ];
      mockPaymentsClient.getPrices.mockResolvedValue(mockPrices as any);

      const result = await paymentService.getPrices('eur', UserType.Individual);

      expect(mockPaymentsClient.getPrices).toHaveBeenCalledWith('eur', UserType.Individual);
      expect(result).toEqual(mockPrices);
    });

    it('fetches prices without parameters', async () => {
      const mockPrices = [{ id: 'price_3', amount: 1299, currency: 'usd' }];
      mockPaymentsClient.getPrices.mockResolvedValue(mockPrices as any);

      const result = await paymentService.getPrices();

      expect(mockPaymentsClient.getPrices).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockPrices);
    });
  });

  describe('isCouponUsedByUser', () => {
    it('detects when user already redeemed coupon', async () => {
      const couponCode = 'SAVE20';
      mockPaymentsClient.isCouponUsedByUser.mockResolvedValue({ couponUsed: true });

      const result = await paymentService.isCouponUsedByUser(couponCode);

      expect(mockPaymentsClient.isCouponUsedByUser).toHaveBeenCalledWith({ couponCode });
      expect(result).toEqual({ couponUsed: true });
    });

    it('allows unused coupons to be applied', async () => {
      const couponCode = 'DISCOUNT10';
      mockPaymentsClient.isCouponUsedByUser.mockResolvedValue({ couponUsed: false });

      const result = await paymentService.isCouponUsedByUser(couponCode);

      expect(mockPaymentsClient.isCouponUsedByUser).toHaveBeenCalledWith({ couponCode: 'DISCOUNT10' });
      expect(result).toEqual({ couponUsed: false });
    });
  });
  describe('createSubscriptionWithTrial', () => {
    it('activates free trial period', async () => {
      vi.spyOn(localStorageService, 'get').mockReturnValue('token');
      vi.spyOn(envService, 'getVariable').mockReturnValue('https://api.test.com');
      vi.mocked(axios.post).mockResolvedValue({ data: { clientSecret: 'cs_123' } });

      await paymentService.createSubscriptionWithTrial('cus_123', 'price_123', 'tok_123', 'trial_tok', 'usd');

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.test.com/create-subscription-with-trial?trialToken=trial_tok',
        { customerId: 'cus_123', priceId: 'price_123', currency: 'usd', token: 'tok_123' },
        { headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' } },
      );
    });

    it('throws error when authentication fails', async () => {
      vi.spyOn(localStorageService, 'get').mockReturnValue(null);

      await expect(paymentService.createSubscriptionWithTrial('cus', 'price', 'tok', 'trial')).rejects.toThrow();
    });
  });
});
