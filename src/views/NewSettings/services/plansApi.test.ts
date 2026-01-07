import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { currencyService, paymentService } from 'views/Checkout/services';
import envService from 'services/env.service';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { userLocation } from 'utils/userLocation';
import { loadStripe } from '@stripe/stripe-js';
import { fetchPlanPrices, getStripe } from './plansApi';

const mockTestPublicKey = 'pk_test_123';
const mockPublicKey = 'pk_live_456';

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(),
}));

vi.mock('views/Checkout/services', () => ({
  paymentService: {
    getPrices: vi.fn(),
  },
  currencyService: {
    getCurrencyForLocation: vi.fn().mockReturnValue('eur'),
  },
}));

vi.mock('utils/userLocation', () => ({
  userLocation: vi.fn(),
}));

describe('Fetching the prices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('When user location is US, then it fetches prices in USD', async () => {
    const currencyForLocationSpy = vi.spyOn(currencyService, 'getCurrencyForLocation').mockReturnValue('usd');

    (userLocation as Mock).mockResolvedValue({ location: 'US' });
    (paymentService.getPrices as Mock).mockResolvedValue(['price_1']);

    const prices = await fetchPlanPrices(UserType.Individual);

    expect(userLocation).toHaveBeenCalled();
    expect(currencyForLocationSpy).toHaveBeenCalledWith('US');
    expect(paymentService.getPrices).toHaveBeenCalledWith('usd', UserType.Individual);
    expect(prices).toEqual(['price_1']);
  });

  it('When user location is unknown, then it fetches prices in EUR', async () => {
    const currencyForLocationSpy = vi.spyOn(currencyService, 'getCurrencyForLocation').mockReturnValue('eur');

    (userLocation as Mock).mockResolvedValue({ location: 'JP' });
    (paymentService.getPrices as Mock).mockResolvedValue(['price_2']);

    const prices = await fetchPlanPrices(UserType.Individual);

    expect(currencyForLocationSpy).toHaveBeenCalledWith('JP');
    expect(paymentService.getPrices).toHaveBeenCalledWith('eur', UserType.Individual);
    expect(prices).toEqual(['price_2']);
  });

  it('When userLocation throws, then it falls back to EUR', async () => {
    (userLocation as Mock).mockRejectedValue(new Error('network error'));
    (paymentService.getPrices as Mock).mockResolvedValue(['price_default']);

    const prices = await fetchPlanPrices(UserType.Individual);

    expect(paymentService.getPrices).toHaveBeenCalledWith('eur', UserType.Individual);
    expect(prices).toEqual(['price_default']);
  });
});

describe('Getting the stripe SDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('When not in production, then loads test stripe key', async () => {
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'stripePublicKey') return mockPublicKey;
      if (key === 'stripeTestPublicKey') return mockTestPublicKey;
      else return 'no implementation';
    });
    vi.spyOn(envService, 'isProduction').mockReturnValue(false);
    (loadStripe as Mock).mockResolvedValue('mockStripeInstance');

    const result = await getStripe(undefined);

    expect(loadStripe).toHaveBeenCalledWith(mockTestPublicKey);
    expect(result).toBe('mockStripeInstance');
  });

  it('When in production, then loads live stripe key', async () => {
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'stripePublicKey') return mockPublicKey;
      if (key === 'stripeTestPublicKey') return mockTestPublicKey;
      else return 'no implementation';
    });
    vi.spyOn(envService, 'isProduction').mockReturnValue(true);
    (loadStripe as Mock).mockResolvedValue('liveStripeInstance');

    const result = await getStripe(undefined);

    expect(loadStripe).toHaveBeenCalledWith(mockPublicKey);
    expect(result).toBe('liveStripeInstance');
  });

  it('When stripe instance is passed, then it returns the same instance', async () => {
    const existingInstance = { id: 'alreadyLoaded' } as any;

    const result = await getStripe(existingInstance);

    expect(loadStripe).not.toHaveBeenCalled();
    expect(result).toBe(existingInstance);
  });
});
