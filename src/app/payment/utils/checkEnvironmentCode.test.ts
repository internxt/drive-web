import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isEnvironmentThemeAvailable } from './checkEnvironmentCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';
import { STORAGE_KEYS } from 'app/core/services/storage-keys';

const COUPON = 'PLANET85';

describe('isEnvironmentThemeAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true if localStorage has the key set to "true"', async () => {
    const getSpy = vi.spyOn(localStorageService, 'get').mockReturnValue('true');

    const result = await isEnvironmentThemeAvailable();

    expect(result).toBe(true);
    expect(getSpy).toHaveBeenCalledWith(STORAGE_KEYS.THEMES.ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY);
  });

  it('returns true, calls onSuccess, and sets localStorage if the coupon is used', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const setSpy = vi.spyOn(localStorageService, 'set');
    const couponSpy = vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValueOnce({ couponUsed: true });

    const onSuccess = vi.fn();
    const result = await isEnvironmentThemeAvailable(onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(couponSpy).toHaveBeenCalledWith(COUPON);
    expect(setSpy).toHaveBeenCalledWith(STORAGE_KEYS.THEMES.ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if the coupon is not used', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const setSpy = vi.spyOn(localStorageService, 'set');
    const couponSpy = vi.spyOn(paymentService, 'isCouponUsedByUser').mockResolvedValue({ couponUsed: false });

    const result = await isEnvironmentThemeAvailable();

    expect(result).toBe(false);
    expect(couponSpy).toHaveBeenCalledWith(COUPON);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('returns false and reports error if paymentService throws', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const couponSpy = vi.spyOn(paymentService, 'isCouponUsedByUser').mockRejectedValue(new Error('fail'));
    const errorSpy = vi.spyOn(errorService, 'reportError').mockImplementation(() => {});

    const result = await isEnvironmentThemeAvailable();

    expect(result).toBe(false);
    expect(couponSpy).toHaveBeenCalledWith(COUPON);
    expect(errorSpy).toHaveBeenCalled();
  });
});
