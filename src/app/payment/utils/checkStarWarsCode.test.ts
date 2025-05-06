import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isStarWarsThemeAvailable, STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkStarWarsCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

vi.mock('app/core/services/local-storage.service');
vi.mock('../services/payment.service');
vi.mock('app/core/services/error.service');

describe('isStarWarsThemeAvailable', () => {
  const planBase = {
    individualSubscription: null,
    businessSubscription: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true if localStorage has the key set to "true"', async () => {
    (localStorageService.get as any).mockReturnValue('true');
    const result = await isStarWarsThemeAvailable(planBase as any);
    expect(result).toBe(true);
  });

  it('returns true and sets localStorage if coupon is used for subscription', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: true });
    const plan = { ...planBase, individualSubscription: { type: 'subscription' } };
    const onSuccess = vi.fn();

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(localStorageService.set).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for subscription', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: false });
    const plan = { ...planBase, businessSubscription: { type: 'subscription' } };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(localStorageService.set).not.toHaveBeenCalled();
  });

  it('returns true and sets localStorage if coupon is used for lifetime', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: true });
    const plan = { ...planBase, individualSubscription: { type: 'lifetime' } };
    const onSuccess = vi.fn();

    const result = await isStarWarsThemeAvailable(plan as any, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(localStorageService.set).toHaveBeenCalledWith(STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if coupon is not used for lifetime', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: false });
    const plan = { ...planBase, businessSubscription: { type: 'lifetime' } };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(localStorageService.set).not.toHaveBeenCalled();
  });

  it('calls errorService.reportError and returns false on error', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockRejectedValue(new Error('fail'));
    const plan = { ...planBase, individualSubscription: { type: 'subscription' } };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
    expect(errorService.reportError).toHaveBeenCalled();
  });

  it('returns false if no subscription or lifetime', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    const plan = { ...planBase };

    const result = await isStarWarsThemeAvailable(plan as any);

    expect(result).toBe(false);
  });
});
