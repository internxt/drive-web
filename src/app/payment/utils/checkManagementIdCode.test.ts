import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isManagementIdThemeAvailable, MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY } from './checkManagementIdCode';
import localStorageService from 'app/core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from 'app/core/services/error.service';
import { PlanState } from 'app/store/slices/plan';

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

describe('checkManagementIdCode', () => {
  const mockPlan: PlanState = {
    isLoadingPlans: false,
    isLoadingPlanLimit: false,
    isLoadingPlanUsage: false,
    individualPlan: null,
    businessPlan: null,
    teamPlan: null,
    planLimit: 0,
    planUsage: 0,
    usageDetails: null,
    individualSubscription: null,
    businessSubscription: null,
    businessPlanLimit: 0,
    businessPlanUsage: 0,
    businessPlanUsageDetails: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true if theme is enabled in localStorage', async () => {
    vi.mocked(localStorageService.get).mockReturnValue('true');

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(true);
    expect(localStorageService.get).toHaveBeenCalledWith(MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY);
    expect(paymentService.isCouponUsedByUser).not.toHaveBeenCalled();
  });

  it('should check coupons if not enabled in localStorage', async () => {
    vi.mocked(localStorageService.get).mockReturnValue(null);
    vi.mocked(paymentService.isCouponUsedByUser)
      .mockResolvedValueOnce({ couponUsed: false })
      .mockResolvedValueOnce({ couponUsed: true });

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(true);
    expect(paymentService.isCouponUsedByUser).toHaveBeenCalledTimes(2);
    expect(paymentService.isCouponUsedByUser).toHaveBeenCalledWith('IDENTITY82');
    expect(paymentService.isCouponUsedByUser).toHaveBeenCalledWith('IDENTITY82AFF');
    expect(localStorageService.set).toHaveBeenCalledWith(MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY, 'true');
  });

  it('should return false if no coupons were used', async () => {
    vi.mocked(localStorageService.get).mockReturnValue(null);
    vi.mocked(paymentService.isCouponUsedByUser).mockResolvedValue({ couponUsed: false });

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(false);
    expect(paymentService.isCouponUsedByUser).toHaveBeenCalledTimes(2);
    expect(localStorageService.set).not.toHaveBeenCalled();
  });

  it('should call onSuccess callback when coupons are used', async () => {
    vi.mocked(localStorageService.get).mockReturnValue(null);
    vi.mocked(paymentService.isCouponUsedByUser)
      .mockResolvedValueOnce({ couponUsed: false })
      .mockResolvedValueOnce({ couponUsed: true });
    const onSuccess = vi.fn();

    await isManagementIdThemeAvailable(mockPlan, onSuccess);

    expect(onSuccess).toHaveBeenCalled();
  });

  it('should handle errors and report them', async () => {
    vi.mocked(localStorageService.get).mockReturnValue(null);
    const error = new Error('Test error');
    vi.mocked(paymentService.isCouponUsedByUser).mockRejectedValue(error);

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(false);
    expect(errorService.reportError).toHaveBeenCalledWith(error);
  });
});
