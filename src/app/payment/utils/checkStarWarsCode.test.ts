import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isStarWarsThemeAvailable, STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkStarWarsCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

vi.mock('app/core/services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    clear: vi.fn(),
    getUser: vi.fn(),
    set: vi.fn(),
  },
}));
vi.mock('../services/payment.service', () => ({
  default: {
    isCouponUsedByUser: vi.fn(),
  },
}));
vi.mock('app/core/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

describe('isStarWarsThemeAvailable', () => {
  const planBase = {
    individualSubscription: null,
    businessSubscription: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true if localStorage has the key set to "true"', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue('true');
    const result = await isStarWarsThemeAvailable(planBase as any);
    expect(result).toBe(true);
  });

  it('returns true and sets localStorage if coupon is used for subscription', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
     const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: true });

    const plan = {
      individualSubscription: { type: 'subscription' },
      businessSubscription: null,
    };

    const onSuccess = vi.fn().mockResolvedValue(() => Promise.resolve());

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(setToLocalStorageSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for subscription', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });

    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'subscription' },
    };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(setToLocalStorageSpy).not.toHaveBeenCalled();
  });

  it('returns true and sets localStorage if coupon is used for lifetime', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
     const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: true });

    const plan = {
      individualSubscription: { type: 'lifetime' },
      businessSubscription: null,
    };

    const onSuccess = vi.fn().mockResolvedValue(() => Promise.resolve());

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(setToLocalStorageSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for lifetime', async () => {
     vi.spyOn(localStorageService, 'get').mockReturnValue(null);
     const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });

    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'lifetime' },
    };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(setToLocalStorageSpy).not.toHaveBeenCalled();
  });

  it('calls errorService.reportError and returns false on error', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockRejectedValue(new Error('fail'));

    const plan = {
      individualSubscription: { type: 'subscription' },
      businessSubscription: null,
    };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(errorService.reportError).toHaveBeenCalled();
  });

  it('returns false if no subscription or lifetime', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);

    const plan = {
      individualSubscription: null,
      businessSubscription: null,
    };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
  });
});
