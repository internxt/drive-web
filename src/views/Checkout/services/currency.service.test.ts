import { CryptoCurrency } from '@internxt/sdk/dist/payments/types';
import { describe, test, vi, expect, beforeEach } from 'vitest';
import currencyService from './currency.service';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn().mockReturnValue({
      createCheckoutClient: vi.fn().mockResolvedValue({
        getAvailableCryptoCurrencies: vi.fn(),
      }),
    }),
  },
}));

describe('Currency Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Fetching the available crypto currencies', () => {
    test('When the available crypto currencies are requested, then the list is returned', async () => {
      const currencies: CryptoCurrency[] = [
        {
          currencyId: 'BTC',
          imageUrl: 'https://example.com/btc.png',
          name: 'Bitcoin',
          networks: [],
          receiveType: false,
          type: 'crypto',
        },
        {
          currencyId: 'ETH',
          imageUrl: 'https://example.com/eth.png',
          name: 'Ethereum',
          networks: [],
          receiveType: false,
          type: 'crypto',
        },
      ];

      const { SdkFactory } = await import('app/core/factory/sdk');
      const mockApiInstance = await SdkFactory.getNewApiInstance();
      const mockCheckoutClient = await mockApiInstance.createCheckoutClient();

      vi.spyOn(mockCheckoutClient, 'getAvailableCryptoCurrencies').mockResolvedValue(currencies);

      const result = await currencyService.getAvailableCryptoCurrencies();

      expect(result).toStrictEqual(currencies);
      expect(result).toHaveLength(2);
      expect(result[0].currencyId).toBe('BTC');
      expect(result[1].currencyId).toBe('ETH');
    });
  });

  describe('Get currency by user location', () => {
    test('When location is mapped, then mapped currency is returned', () => {
      const result = currencyService.getCurrencyForLocation('US');

      expect(result).toStrictEqual('usd');
    });

    test('When location is mapped to usd but is not the US, then usd is returned', () => {
      const result = currencyService.getCurrencyForLocation('CA');

      expect(result).toStrictEqual('usd');
    });

    test('When location is India, then inr is returned', () => {
      const result = currencyService.getCurrencyForLocation('IN');

      expect(result).toStrictEqual('inr');
    });

    test('When location is Brazil, then brl is returned', () => {
      const result = currencyService.getCurrencyForLocation('BR');

      expect(result).toStrictEqual('brl');
    });

    test('When location is mapped and a fallback currency is provided, then the mapped currency wins', () => {
      const result = currencyService.getCurrencyForLocation('IN', 'eur');

      expect(result).toStrictEqual('inr');
    });

    test('When location is not mapped and fallback currency is provided, then fallback currency is returned', () => {
      const fallbackCurrency = 'gbp';
      const result = currencyService.getCurrencyForLocation('ES', fallbackCurrency);

      expect(result).toStrictEqual(fallbackCurrency);
    });

    test('When location is not mapped and no fallback currency is provided, then default eur currency is returned', () => {
      const result = currencyService.getCurrencyForLocation('MX');

      expect(result).toStrictEqual('eur');
    });

    test('When location is undefined and no fallback currency is provided, then default eur currency is returned', () => {
      const result = currencyService.getCurrencyForLocation();

      expect(result).toStrictEqual('eur');
    });
  });

  describe('Get currency symbol', () => {
    test('When the currency is brl, then the Brazilian real symbol is returned', () => {
      const result = currencyService.getCurrencySymbol('brl');

      expect(result).toStrictEqual('R$');
    });

    test('When the currency is inr, then the Indian rupee symbol is returned', () => {
      const result = currencyService.getCurrencySymbol('inr');

      expect(result).toStrictEqual('₹');
    });

    test('When the currency is eur, then the euro symbol is returned', () => {
      const result = currencyService.getCurrencySymbol('eur');

      expect(result).toStrictEqual('€');
    });

    test('When the currency is uppercase, then the symbol is still returned', () => {
      const result = currencyService.getCurrencySymbol('BRL');

      expect(result).toStrictEqual('R$');
    });

    test('When the currency is an empty string, then the euro symbol is returned', () => {
      const result = currencyService.getCurrencySymbol('');

      expect(result).toStrictEqual('€');
    });
  });
});
