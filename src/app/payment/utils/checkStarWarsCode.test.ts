import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { isStarWarsThemeAvailable, STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkStarWarsCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

vi.mock('app/core/services/local-storage.service', async () => {
  const actual = await vi.importActual<typeof import('app/core/services/local-storage.service')>(
    'app/core/services/local-storage.service',
  );

  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn(),
      set: vi.fn(),
    },
  };
});
vi.mock('../services/payment.service');
vi.mock('app/core/services/error.service');

describe('isStarWarsThemeAvailable', () => {
  const planBase = {
    individualSubscription: null,
    businessSubscription: null,
  };

  beforeEach(() => {
    vi.resetAllMocks();

    (localStorageService.get as Mock).mockReset();
    (localStorageService.set as Mock).mockReset();
  });

  it('returns true if localStorage has the key set to "true"', async () => {
    (localStorageService.get as Mock).mockReturnValue('true');
    const result = await isStarWarsThemeAvailable(planBase as any);
    expect(result).toBe(true);
  });

  it('returns true and sets localStorage if coupon is used for subscription', async () => {
    (localStorageService.get as Mock).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: true });

    const plan = {
      individualSubscription: { type: 'subscription' },
      businessSubscription: null,
    };

    const onSuccess = vi.fn().mockResolvedValue(() => Promise.resolve());

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(localStorageService.set).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for subscription', async () => {
    (localStorageService.get as Mock).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: false });

    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'subscription' },
    };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(localStorageService.set).not.toHaveBeenCalled();
  });

  it('returns true and sets localStorage if coupon is used for lifetime', async () => {
    (localStorageService.get as Mock).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: true });

    const plan = {
      individualSubscription: { type: 'lifetime' },
      businessSubscription: null,
    };

    const onSuccess = vi.fn().mockResolvedValue(() => Promise.resolve());

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(localStorageService.set).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for lifetime', async () => {
    (localStorageService.get as Mock).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: false });

    const plan = {
      individualSubscription: null,
      businessSubscription: { type: 'lifetime' },
    };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(localStorageService.set).not.toHaveBeenCalled();
  });

  it('calls errorService.reportError and returns false on error', async () => {
    (localStorageService.get as Mock).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockRejectedValue(new Error('fail'));

    const plan = {
      individualSubscription: { type: 'subscription' },
      businessSubscription: null,
    };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(errorService.reportError).toHaveBeenCalled();
  });

  it('returns false if no subscription or lifetime', async () => {

    (localStorageService.get as Mock).mockReturnValue(undefined);

    const plan = {
      individualSubscription: null,
      businessSubscription: null,
    };


    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
  });
});
