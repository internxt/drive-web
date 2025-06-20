import { describe, expect, it, vi, beforeEach } from 'vitest';
import usageService from './usage.service';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';

describe('usageService', () => {
  const spaceUsageV2Spy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const mockStorageClient = {
      spaceUsageV2: spaceUsageV2Spy,
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
    } as any);
  });
  describe('fetchUsage', () => {
    it('should fetch usage data successfully', async () => {
      spaceUsageV2Spy.mockResolvedValue({ drive: 100, backups: 50 });

      const result = await usageService.fetchUsage();

      expect(spaceUsageV2Spy).toHaveBeenCalled();
      expect(result).toEqual({ drive: 100, backups: 50 });
    });
  });

  describe('getUsageDetails', () => {
    it('should return usage details successfully', async () => {
      spaceUsageV2Spy.mockResolvedValue({ drive: 200, backups: 100 });

      const result = await usageService.getUsageDetails();

      expect(spaceUsageV2Spy).toHaveBeenCalled();
      expect(result).toEqual({ drive: 200, photos: 0, backups: 100 });
    });

    it('should handle errors and return default values', async () => {
      spaceUsageV2Spy.mockRejectedValue(new Error('API error'));
      const reportErrorSpy = vi.spyOn(errorService, 'reportError');

      const result = await usageService.getUsageDetails();
      expect(reportErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(spaceUsageV2Spy).toHaveBeenCalled();
      expect(reportErrorSpy).toHaveBeenCalledWith(new Error('API error'));
      expect(result).toEqual({ drive: 0, photos: 0, backups: 0 });
    });
  });

  describe('getUsagePercent', () => {
    it('should calculate usage percentage correctly', () => {
      const usage = 50;
      const limit = 200;

      const result = usageService.getUsagePercent(usage, limit);

      expect(result).toBe(25);
    });
  });
});
