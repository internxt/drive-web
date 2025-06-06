import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isManagementIdThemeAvailable } from './checkManagementIdCode';
import localStorageService, { STORAGE_KEYS } from '../../core/services/local-storage.service';
import paymentService from '../services/payment.service';
import errorService from '../../core/services/error.service';
import { PlanState } from '../../store/slices/plan';

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
    const getFromLocalStorageSpy = vi.spyOn(localStorageService, 'get').mockReturnValue('true');
    const isCouponUsedByUserSpy = vi.spyOn(paymentService, 'isCouponUsedByUser');

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(true);
    expect(getFromLocalStorageSpy).toHaveBeenCalledWith(
      STORAGE_KEYS.THEMES.ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
    );
    expect(isCouponUsedByUserSpy).not.toHaveBeenCalled();
  });

  it('should check coupons if not enabled in localStorage', async () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    const isCouponUsedByUserSpy = vi.spyOn(paymentService, 'isCouponUsedByUser');
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.mocked(paymentService.isCouponUsedByUser)
      .mockResolvedValueOnce({ couponUsed: false })
      .mockResolvedValueOnce({ couponUsed: true });

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(true);
    expect(isCouponUsedByUserSpy).toHaveBeenCalledTimes(2);
    expect(isCouponUsedByUserSpy).toHaveBeenCalledWith('IDENTITY82');
    expect(isCouponUsedByUserSpy).toHaveBeenCalledWith('IDENTITY82AFF');
    expect(setToLocalStorageSpy).toHaveBeenCalledWith(
      STORAGE_KEYS.THEMES.ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
      'true',
    );
  });

  it('should return false if no coupons were used', async () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    const isCouponUsedByUserSpy = vi.spyOn(paymentService, 'isCouponUsedByUser');
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.mocked(paymentService.isCouponUsedByUser).mockResolvedValue({ couponUsed: false });

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(false);
    expect(isCouponUsedByUserSpy).toHaveBeenCalledTimes(2);
    expect(setToLocalStorageSpy).not.toHaveBeenCalled();
  });

  it('should call onSuccess callback when coupons are used', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.mocked(paymentService.isCouponUsedByUser)
      .mockResolvedValueOnce({ couponUsed: false })
      .mockResolvedValueOnce({ couponUsed: true });
    const onSuccess = vi.fn();

    await isManagementIdThemeAvailable(mockPlan, onSuccess);

    expect(onSuccess).toHaveBeenCalled();
  });

  it('should handle errors and report them', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const error = new Error('Test error');
    vi.spyOn(paymentService, 'isCouponUsedByUser').mockRejectedValue(error);

    const result = await isManagementIdThemeAvailable(mockPlan);

    expect(result).toBe(false);
    expect(errorService.reportError).toHaveBeenCalledWith(error);
  });
});
