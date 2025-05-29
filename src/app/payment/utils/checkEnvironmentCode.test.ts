import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isEnvironmentThemeAvailable, ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkEnvironmentCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';

vi.mock('app/core/services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
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

const planMock = {} as any;

describe('isEnvironmentThemeAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true if localStorage has the key set to "true"', async () => {
    (localStorageService.get as any).mockReturnValue('true');
    const result = await isEnvironmentThemeAvailable(planMock);
    expect(result).toBe(true);
    expect(localStorageService.get).toHaveBeenCalledWith(ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY);
  });

  it('returns true, calls onSuccess, and sets localStorage if the coupon is used', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValueOnce({ couponUsed: true });

    const onSuccess = vi.fn();
    const result = await isEnvironmentThemeAvailable(planMock, onSuccess);

    expect(result).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(localStorageService.set).toHaveBeenCalledWith(ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('returns false if the coupon is not used', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockResolvedValue({ couponUsed: false });

    const result = await isEnvironmentThemeAvailable(planMock);
    expect(result).toBe(false);
    expect(localStorageService.set).not.toHaveBeenCalled();
  });

  it('returns false and reports error if paymentService throws', async () => {
    (localStorageService.get as any).mockReturnValue(undefined);
    (paymentService.isCouponUsedByUser as any).mockRejectedValue(new Error('fail'));

    const result = await isEnvironmentThemeAvailable(planMock);
    expect(result).toBe(false);
    expect(errorService.reportError).toHaveBeenCalled();
  });
});
