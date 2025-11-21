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
});
