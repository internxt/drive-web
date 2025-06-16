import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isStarWarsThemeAvailable, STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkStarWarsCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';
import { PlanState } from 'app/store/slices/plan';

describe('isStarWarsThemeAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true if localStorage has the key set to "true"', async () => {
    const planBase = {
      individualSubscription: null,
      businessSubscription: null,
    } as PlanState;
    vi.spyOn(localStorageService, 'get').mockReturnValue('true');

    const result = await isStarWarsThemeAvailable(planBase);
    expect(result).toBe(true);
  });

  it('returns true and sets localStorage if coupon is used for subscription', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: true });
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

    const plan = {
      individualSubscription: { type: 'subscription' },
      businessSubscription: null,
    } as PlanState;

    const onSuccess = vi.fn().mockResolvedValue(() => Promise.resolve());

    const result = await isStarWarsThemeAvailable(plan, onSuccess);

    expect(onSuccess).toHaveBeenCalled();
    expect(setToLocalStorageSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
    expect(result).toBe(true);
  });

  it('returns false if coupon is not used for subscription', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'subscription' },
    } as PlanState;

    const result = await isStarWarsThemeAvailable(plan);

    expect(setToLocalStorageSpy).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('returns true and sets localStorage if coupon is used for lifetime', async () => {
    const getSpy = vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const isCouponUsedByUserSpy = vi
      .spyOn(paymentService, 'isCouponUsedByUser')
      .mockResolvedValue({ couponUsed: true });
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

    const plan = {
      individualSubscription: { type: 'lifetime' },
      businessSubscription: null,
    } as PlanState;

    const onSuccess = vi.fn().mockResolvedValue(() => Promise.resolve());

    const result = await isStarWarsThemeAvailable(plan, onSuccess);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY);
    expect(isCouponUsedByUserSpy).toHaveBeenCalledTimes(1);
    expect(isCouponUsedByUserSpy).toHaveBeenCalledWith('STARWARS85');
    expect(onSuccess).toHaveBeenCalled();
    expect(setToLocalStorageSpy).toHaveBeenCalledTimes(1);
    expect(setToLocalStorageSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
    expect(result).toBe(true);
  });

  it('returns false if coupon is not used for lifetime', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'lifetime' },
    } as PlanState;

    const result = await isStarWarsThemeAvailable(plan);

    expect(result).toBe(false);
    expect(setToLocalStorageSpy).not.toHaveBeenCalled();
  });

  it('calls errorService.reportError and returns false on error', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockRejectedValue(new Error('fail'));
    const errorServiceSpy = vi.spyOn(errorService, 'reportError');

    const plan = {
      individualSubscription: { type: 'subscription' },
      businessSubscription: null,
    } as PlanState;

    const result = await isStarWarsThemeAvailable(plan);

    expect(result).toBe(false);
    expect(errorServiceSpy).toHaveBeenCalled();
  });

  it('returns false if no subscription or lifetime', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);

    const plan = {
      individualSubscription: null,
      businessSubscription: null,
    } as PlanState;

    const result = await isStarWarsThemeAvailable(plan);

    expect(result).toBe(false);
  });
});
