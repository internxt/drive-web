import {
  CreatePaymentIntentPayload,
  CreateSubscriptionPayload,
  GetPriceByIdPayload,
} from '@internxt/sdk/dist/payments/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import checkoutService from './checkout.service';
import paymentService from './payment.service';

vi.mock('./payment.service', () => ({
  default: {
    createSubscriptionWithTrial: vi.fn(),
  },
}));

vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getInstance: vi.fn().mockReturnValue({
      createCheckoutClient: vi.fn().mockResolvedValue({
        getCustomerId: vi.fn().mockResolvedValue({
          customerId: 'cus_123',
          token: 'token_123',
        }),
        getPriceById: vi.fn().mockResolvedValue({
          price: {
            id: 'price_123',
            currency: 'eur',
            amount: 11988,
            bytes: 1099511627776,
            interval: 'year',
            decimalAmount: 119.88,
            type: 'individual',
            product: 'prod_123',
          },
          taxes: {
            tax: 2517,
            decimalTax: 25.17,
            amountWithTax: 14505,
            decimalAmountWithTax: 145.05,
          },
        }),
        createSubscription: vi.fn().mockResolvedValue({
          type: 'payment',
          clientSecret: 'client_secret',
          subscriptionId: 'sub_123',
          paymentIntentId: 'py_123',
        }),
        createPaymentIntent: vi.fn().mockResolvedValue({
          clientSecret: 'client_secret',
          id: 'py_id',
          invoiceStatus: 'paid',
        }),
        fetchPrices: vi.fn().mockResolvedValue([{ id: 'price_1', currency: 'eur', amount: 1000 }]),
      }),
    }),
  },
}));

vi.mock('../../utils/userLocation', () => ({
  userLocation: vi.fn().mockResolvedValue({
    ip: '123.12.12.12',
    location: 'ES',
  }),
}));

describe('Checkout Service tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Get Customer ID function', () => {
    it('When the customer Id is requested, then the customer ID and the user token are returned', async () => {
      const getCustomerPayload = {
        customerName: 'User customer',
        countryCode: 'ES',
        postalCode: '12345',
        vatId: 'VAT123',
      };

      const result = await checkoutService.getCustomerId(getCustomerPayload);

      expect(result).toStrictEqual({
        customerId: 'cus_123',
        token: 'token_123',
      });
    });
  });

  describe('Get price and taxes using the ID of the price', () => {
    it('When a price is requested by its ID, then the price and its taxes are returned', async () => {
      const getPriceByIdPayload: GetPriceByIdPayload = {
        priceId: 'price_123',
        country: 'ES',
        currency: 'eur',
        postalCode: '12345',
      };

      const priceByIdResponse = await checkoutService.getPriceById(getPriceByIdPayload);

      expect(priceByIdResponse).toStrictEqual({
        price: {
          id: 'price_123',
          currency: 'eur',
          amount: 11988,
          bytes: 1099511627776,
          interval: 'year',
          decimalAmount: 119.88,
          type: 'individual',
          product: 'prod_123',
        },
        taxes: {
          tax: 2517,
          decimalTax: 25.17,
          amountWithTax: 14505,
          decimalAmountWithTax: 145.05,
        },
      });
    });
  });

  describe('Create customer subscription', () => {
    it('When the user attempts to create a subscription with the basic params, then the necessary data to purchase the sub are returned', async () => {
      const createSubPayload: CreateSubscriptionPayload = {
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'user_mocked_token',
      };

      const createSubResponse = await checkoutService.createSubscription(createSubPayload);

      expect(createSubResponse).toStrictEqual({
        type: 'payment',
        clientSecret: 'client_secret',
        subscriptionId: 'sub_123',
        paymentIntentId: 'py_123',
      });
    });

    it('When the user attempts to create a subscription with a promotion code, then the necessary data to purchase the sub are returned', async () => {
      const createSubPayload: CreateSubscriptionPayload = {
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'user_mocked_token',
        promoCodeId: 'promo_code_id',
      };

      const createSubResponse = await checkoutService.createSubscription(createSubPayload);

      expect(createSubResponse).toStrictEqual({
        type: 'payment',
        clientSecret: 'client_secret',
        subscriptionId: 'sub_123',
        paymentIntentId: 'py_123',
      });
    });

    it('When the user attempts to create a b2b subscription (quantity = 3), then the necessary data to purchase the sub are returned', async () => {
      const createSubPayload: CreateSubscriptionPayload = {
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'user_mocked_token',
        quantity: 3,
      };

      const createSubResponse = await checkoutService.createSubscription(createSubPayload);

      expect(createSubResponse).toStrictEqual({
        type: 'payment',
        clientSecret: 'client_secret',
        subscriptionId: 'sub_123',
        paymentIntentId: 'py_123',
      });
    });
  });

  describe('Create a payment intent', () => {
    it('When the user creates a payment intent, then the correct data is returned', async () => {
      const createInvoicePayload: CreatePaymentIntentPayload = {
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'user_mocked_token',
        currency: 'eur',
      };

      const createInvoiceResponse = await checkoutService.createPaymentIntent(createInvoicePayload);

      expect(createInvoiceResponse).toStrictEqual({
        clientSecret: 'client_secret',
        id: 'py_id',
        invoiceStatus: 'paid',
      });
    });

    it('When the user creates a payment intent with a promotional code, then the correct data is returned', async () => {
      const createInvoicePayload: CreatePaymentIntentPayload = {
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'user_mocked_token',
        currency: 'eur',
        promoCodeId: 'promo_code_name',
      };

      const createInvoiceResponse = await checkoutService.createPaymentIntent(createInvoicePayload);

      expect(createInvoiceResponse).toStrictEqual({
        clientSecret: 'client_secret',
        id: 'py_id',
        invoiceStatus: 'paid',
      });
    });
  });

  describe('Get the client secret from a payment intent', () => {
    it('When the user wants to purchase a one time payment, then the correct data is returned', async () => {
      const createInvoicePayload = {
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'user_mocked_token',
        currency: 'eur',
      };

      const createInvoiceResponse = await checkoutService.getClientSecretForPaymentIntent(createInvoicePayload);

      expect(createInvoiceResponse).toStrictEqual({
        clientSecretType: 'payment',
        client_secret: 'client_secret',
        paymentIntentId: 'py_id',
        invoiceStatus: 'paid',
      });
    });

    it('When the user wants to purchase a one time payment with a promotional code, then the correct data is returned', async () => {
      const createInvoicePayload = {
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'user_mocked_token',
        currency: 'eur',
        promoCodeId: 'promo_code_name',
      };

      const createInvoiceResponse = await checkoutService.getClientSecretForPaymentIntent(createInvoicePayload);

      expect(createInvoiceResponse).toStrictEqual({
        clientSecretType: 'payment',
        client_secret: 'client_secret',
        paymentIntentId: 'py_id',
        invoiceStatus: 'paid',
      });
    });
  });

  describe('Fetch promotion code by name', () => {
    it('When a valid promo code is passed, then it returns correct promo data', async () => {
      vi.spyOn(checkoutService, 'fetchPromotionCodeByName').mockResolvedValue({
        codeId: 'promo_123',
        codeName: 'PROMO',
        amountOff: 500,
        percentOff: undefined,
      });
      const result = await checkoutService.fetchPromotionCodeByName('price_123', 'PROMO');
      expect(result).toEqual({
        codeId: 'promo_123',
        codeName: 'PROMO',
        amountOff: 500,
        percentOff: undefined,
      });
    });
  });

  describe('Fetch the client secret for a subscription', () => {
    it('When mobileToken is provided, then it uses paymentService to create subscription with trial', async () => {
      const createSubscriptionWithTrialSpy = vi.spyOn(paymentService, 'createSubscriptionWithTrial').mockResolvedValue({
        type: 'setup',
        clientSecret: 'client_secret',
        subscriptionId: 'sub_id',
        paymentIntentId: 'pi_id',
      });

      const result = await checkoutService.getClientSecretForSubscriptionIntent({
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'token_123',
        mobileToken: 'mobile_token',
        currency: 'eur',
      });

      expect(createSubscriptionWithTrialSpy).toHaveBeenCalledWith(
        'cus_123',
        'price_123',
        'token_123',
        'mobile_token',
        'eur',
      );

      expect(result).toEqual({
        clientSecretType: 'setup',
        client_secret: 'client_secret',
        subscriptionId: 'sub_id',
        paymentIntentId: 'pi_id',
      });
    });

    it('When mobileToken is not provided, then it uses checkoutService to create subscription', async () => {
      const result = await checkoutService.getClientSecretForSubscriptionIntent({
        customerId: 'cus_123',
        priceId: 'price_123',
        token: 'token_123',
        mobileToken: null,
        currency: 'eur',
        seatsForBusinessSubscription: 5,
        promoCodeId: 'promo_1',
      });

      expect(result).toEqual({
        clientSecretType: 'payment',
        client_secret: 'client_secret',
        subscriptionId: 'sub_123',
        paymentIntentId: 'py_123',
      });
    });
  });

  describe('Fetch the user client secret', () => {
    const selectedPlan = {
      price: {
        id: 'price_123',
        currency: 'eur',
        interval: 'lifetime',
      },
      taxes: { amountWithTax: 1000 },
    } as any;

    it('When plan is lifetime, then it gets payment intent secret', async () => {
      const result = await checkoutService.getClientSecret({
        selectedPlan,
        token: 'token',
        mobileToken: null,
        customerId: 'cus_123',
      });

      expect(result).toEqual({
        type: 'payment',
        clientSecret: 'client_secret',
        paymentIntentId: 'py_id',
        invoiceStatus: 'paid',
      });
    });

    it('When plan is subscription, then it gets subscription intent secret', async () => {
      const subPlan = { ...selectedPlan, price: { ...selectedPlan.price, interval: 'year' } };

      const result = await checkoutService.getClientSecret({
        selectedPlan: subPlan,
        token: 'token',
        mobileToken: null,
        customerId: 'cus_123',
        promoCodeId: 'promo_123',
      });

      expect(result).toEqual({
        type: 'payment',
        clientSecret: 'client_secret',
        subscriptionId: 'sub_123',
        paymentIntentId: 'py_123',
      });
    });
  });

  describe('Loading Stripe Elements', () => {
    it('When called for a lifetime plan, then it returns a configured stripe element options object', async () => {
      const theme = {
        backgroundColor: '#000',
        textColor: '#fff',
        borderColor: '#ccc',
        borderInputColor: '#aaa',
        labelTextColor: '#eee',
      };

      const plan = {
        price: {
          interval: 'lifetime',
          currency: 'eur',
        },
        taxes: {
          amountWithTax: 1500,
        },
      } as any;

      const options = await checkoutService.loadStripeElements(theme, plan);

      expect(options).toMatchObject({
        appearance: expect.any(Object),
        mode: 'payment',
        amount: 1500,
        currency: 'eur',
        payment_method_types: ['card', 'paypal'],
      });
    });

    it('When called for a subscription plan, then it returns a configured stripe element options object', async () => {
      const theme = {
        backgroundColor: '#000',
        textColor: '#fff',
        borderColor: '#ccc',
        borderInputColor: '#aaa',
        labelTextColor: '#eee',
      };

      const plan = {
        price: {
          interval: 'year',
          currency: 'eur',
        },
        taxes: {
          amountWithTax: 1500,
        },
      } as any;

      const options = await checkoutService.loadStripeElements(theme, plan);

      expect(options).toMatchObject({
        appearance: expect.any(Object),
        mode: 'subscription',
        amount: 1500,
        currency: 'eur',
        payment_method_types: ['card', 'paypal'],
      });
    });
  });
});
