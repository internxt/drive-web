// __tests__/checkoutService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import checkoutService from './checkout.service';
import { CreateSubscriptionPayload, GetPriceByIdPayload } from '@internxt/sdk/dist/payments/types';

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

  describe('Create one time payment for customer', () => {
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
});
