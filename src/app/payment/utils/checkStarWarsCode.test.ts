import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isStarWarsThemeAvailable, STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkStarWarsCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';
import { PlanState } from 'app/store/slices/plan';

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
vi.mock('app/core/services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

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
    const localStorageSetSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: true });

    const plan = {
      individualSubscription: { type: 'subscription' },
      businessSubscription: null,
    } as PlanState;

    const onSuccess = vi.fn();

    const result = await isStarWarsThemeAvailable(plan, onSuccess);

    expect(onSuccess).toHaveBeenCalled();
    expect(localStorageSetSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
    expect(result).toBe(true);
  });

  it('returns false if coupon is not used for subscription', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const localStorageSetSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });

    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'subscription' },
    } as PlanState;

    const result = await isStarWarsThemeAvailable(plan);

    expect(result).toBe(false);
    expect(localStorageSetSpy).not.toHaveBeenCalled();
  });

  it('returns true and sets localStorage if coupon is used for lifetime', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const localStorageSetSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: true });

    const plan = {
      individualSubscription: { type: 'lifetime' },
      businessSubscription: null,
    } as PlanState;

    const onSuccess = vi.fn();

    const result = await isStarWarsThemeAvailable(plan, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(localStorageSetSpy).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for lifetime', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const localStorageSetSpy = vi.spyOn(localStorageService, 'set');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });

    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'lifetime' },
    } as PlanState;

    const result = await isStarWarsThemeAvailable(plan);

    expect(localStorageSetSpy).not.toHaveBeenCalled();
    expect(result).toBe(false);
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

    expect(errorServiceSpy).toHaveBeenCalled();
    expect(result).toBe(false);
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
