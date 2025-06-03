import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { isStarWarsThemeAvailable, STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkStarWarsCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

vi.mock('app/core/services/error.service');

beforeAll(() => {
  localStorage.clear();
});

describe('isStarWarsThemeAvailable', () => {
  const planBase = {
    individualSubscription: null,
    businessSubscription: null,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  it('returns true if localStorage has the key set to "true"', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue('true');

    const result = await isStarWarsThemeAvailable(planBase as any);
    expect(result).toBe(true);
  });

  it('returns true and sets localStorage if coupon is used for subscription', async () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: true });

    const plan = { ...planBase, individualSubscription: { type: 'subscription' } };
    const onSuccess = vi.fn();

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(setToLocalStorageSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for subscription', async () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });
    const plan = { ...planBase, businessSubscription: { type: 'subscription' } };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(setToLocalStorageSpy).not.toHaveBeenCalled();
  });

  it('returns true and sets localStorage if coupon is used for lifetime', async () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: true });
    const plan = { ...planBase, individualSubscription: { type: 'lifetime' } };
    const onSuccess = vi.fn();

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(setToLocalStorageSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for lifetime', async () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });
    const plan = { ...planBase, businessSubscription: { type: 'lifetime' } };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(setToLocalStorageSpy).not.toHaveBeenCalled();
  });

  it('calls errorService.reportError and returns false on error', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockRejectedValue(new Error('Unexpected error'));

    const plan = { ...planBase, individualSubscription: { type: 'subscription' } };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(errorService.reportError).toHaveBeenCalled();
  });

  it('returns false if no subscription or lifetime', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const plan = { ...planBase };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
  });
});
