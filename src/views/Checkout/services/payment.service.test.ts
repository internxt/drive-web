import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadStripe } from '@stripe/stripe-js/pure';
import paymentService from './payment.service';
import { SdkFactory } from '../../../app/core/factory/sdk';
import { envService, localStorageService } from 'services';
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
    it('loads Stripe payment system with correct credentials', async () => {
      vi.spyOn(envService, 'isProduction').mockReturnValue(true);
      vi.spyOn(envService, 'getVariable').mockReturnValue('pk_live_test');

      const stripe = await paymentService.getStripe();

      expect(loadStripe).toHaveBeenCalledWith('pk_live_test');
      expect(stripe).toBe(mockStripe);
    });
  });

  describe('getCustomerId', () => {
    it('creates customer account and receives credentials', async () => {
      const mockResponse = { customerId: 'cus_123', token: 'tok_123' };
      mockPaymentsClient.createCustomer.mockResolvedValue(mockResponse);

      const result = await paymentService.getCustomerId('John Doe', 'john@example.com', 'US', 'VAT123');

      expect(mockPaymentsClient.createCustomer).toHaveBeenCalledWith('John Doe', 'john@example.com', 'US', 'VAT123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createSubscription', () => {
    it('sets up recurring subscription with discount and team size', async () => {
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
    it('initiates one-time payment for selected plan', async () => {
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
    it('launches payment page for user', async () => {
      const payload = { mode: 'subscription' as StripeSessionMode, priceId: 'price_123' };
      const mockResponse = { id: 'cs_123' };
      mockPaymentsClient.createSession.mockResolvedValue(mockResponse);

      const result = await paymentService.createSession(payload);

      expect(mockPaymentsClient.createSession).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateSubscriptionPrice', () => {
    it('upgrades or downgrades plan with coupon', async () => {
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
    it('stops ongoing subscription for user', async () => {
      mockPaymentsClient.cancelSubscription.mockResolvedValue(undefined);

      await paymentService.cancelSubscription(UserType.Individual);

      expect(mockPaymentsClient.cancelSubscription).toHaveBeenCalledWith(UserType.Individual);
    });
  });

  describe('requestPreventCancellation', () => {
    it('checks if user can receive special offer to stay', async () => {
      mockPaymentsClient.requestPreventCancellation.mockResolvedValue({ elegible: true });

      const result = await paymentService.requestPreventCancellation();

      expect(mockPaymentsClient.requestPreventCancellation).toHaveBeenCalled();
      expect(result.elegible).toBe(true);
    });
  });

  describe('getUserSubscription', () => {
    it('gets current subscription information for personal account', async () => {
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

    it('gets subscription details without specifying account type', async () => {
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
    it('shows available plan prices for selected currency and account type', async () => {
      const mockPrices = [
        { id: 'price_1', amount: 999, currency: 'eur' },
        { id: 'price_2', amount: 1999, currency: 'eur' },
      ];
      mockPaymentsClient.getPrices.mockResolvedValue(mockPrices as any);

      const result = await paymentService.getPrices('eur', UserType.Individual);

      expect(mockPaymentsClient.getPrices).toHaveBeenCalledWith('eur', UserType.Individual);
      expect(result).toEqual(mockPrices);
    });

    it('shows default pricing options', async () => {
      const mockPrices = [{ id: 'price_3', amount: 1299, currency: 'usd' }];
      mockPaymentsClient.getPrices.mockResolvedValue(mockPrices as any);

      const result = await paymentService.getPrices();

      expect(mockPaymentsClient.getPrices).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockPrices);
    });
  });

  describe('isCouponUsedByUser', () => {
    it('verifies if user previously used this discount code', async () => {
      const couponCode = 'SAVE20';
      mockPaymentsClient.isCouponUsedByUser.mockResolvedValue({ couponUsed: true });

      const result = await paymentService.isCouponUsedByUser(couponCode);

      expect(mockPaymentsClient.isCouponUsedByUser).toHaveBeenCalledWith({ couponCode });
      expect(result).toEqual({ couponUsed: true });
    });

    it('confirms discount code is available for user', async () => {
      const couponCode = 'DISCOUNT10';
      mockPaymentsClient.isCouponUsedByUser.mockResolvedValue({ couponUsed: false });

      const result = await paymentService.isCouponUsedByUser(couponCode);

      expect(mockPaymentsClient.isCouponUsedByUser).toHaveBeenCalledWith({ couponCode: 'DISCOUNT10' });
      expect(result).toEqual({ couponUsed: false });
    });
  });
  describe('createSubscriptionWithTrial', () => {
    it('starts subscription with complimentary trial', async () => {
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

    it('prevents trial activation without valid login', async () => {
      vi.spyOn(localStorageService, 'get').mockReturnValue(null);

      await expect(paymentService.createSubscriptionWithTrial('cus', 'price', 'tok', 'trial')).rejects.toThrow();
    });
  });
});
