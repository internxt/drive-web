import { describe, expect, it, vi } from 'vitest';
import { savePaymentDataInLocalStorage, trackPaymentConversion } from './impact.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { getProductAmount } from 'app/payment/utils/getProductAmount';
import axios from 'axios';
import localStorageService from 'app/core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

vi.mock('./utils', () => ({
  getCookie: vi.fn((key: string) => {
    if (key === 'impactAnonymousId') return 'anon_id';
    if (key === 'impactSource') return 'ads';
    return '';
  }),
}));

const subId = 'sub_123';
const paymentIntentId = 'py_123';

const promoCode = {
  amountOff: undefined,
  codeId: 'promo_123',
  percentOff: 99,
  codeName: 'PROMO',
};

const product = {
  price: {
    id: 'price_123',
    currency: 'eur',
    amount: 11988,
    bytes: 1099511627776,
    interval: 'year',
    decimalAmount: 119.88,
    type: 'individual',
    product: 'prod_1234',
  },
  taxes: {
    tax: 25,
    decimalTax: 0.25,
    amountWithTax: 145,
    decimalAmountWithTax: 1.45,
  },
};
const expectedAmount = getProductAmount(product.price.decimalAmount, 1, promoCode);

describe('Testing Impact Service', () => {
  describe('Store necessary data to track it later', () => {
    it('When wants to store the data, then the price to convert is the correct one', () => {
      const setToLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      savePaymentDataInLocalStorage(subId, paymentIntentId, product as PriceWithTax, 1, promoCode);

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('amountPaid', expectedAmount);
    });
  });

  describe('Send the track with the correct data', () => {
    it('When the track is requested, then the necessary data is sent', async () => {
      const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});
      vi.spyOn(localStorageService, 'getUser').mockReturnValue({
        uuid: 'user_uuid',
      } as unknown as UserSettings);

      await trackPaymentConversion();

      expect(axiosSpy).toHaveBeenCalledTimes(1);

      const callArgs = axiosSpy.mock.calls[0][1];
      expect(callArgs).toMatchObject({
        anonymousId: 'anon_id',
        properties: {
          impact_value: parseFloat(expectedAmount),
          subscription_id: subId,
        },
        userId: 'user_uuid',
        type: 'track',
        event: 'Payment Conversion',
      });
    });
  });
});
