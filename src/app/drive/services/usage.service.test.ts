import { describe, it, expect, vi, beforeEach } from 'vitest';
import usageService from './usage.service';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';
import { UsageResponseV2 } from '@internxt/sdk/dist/drive/storage/types';
vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('../../core/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

describe('usageService', () => {
  const mockStorageClient = {
    spaceUsageV2: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    } as any);
  });

  describe('fetchUsage', () => {
    it('should fetch usage successfully', async () => {
      const usageResponse: UsageResponseV2 = {
        drive: 1024 * 1024 * 100, // 100MB
        backups: 1024 * 1024 * 50, // 50MB
        total: 1024 * 1024 * 150, // 150MB
      };
      mockStorageClient.spaceUsageV2.mockResolvedValue(usageResponse);

      const result = await usageService.fetchUsage();

      expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
      expect(mockStorageClient.spaceUsageV2).toHaveBeenCalled();
      expect(result).toEqual(usageResponse);
    });

    it('should handle errors when fetching usage', async () => {
      const error = new Error('Failed to fetch usage');
      mockStorageClient.spaceUsageV2.mockRejectedValue(error);

      await expect(usageService.fetchUsage()).rejects.toThrow(error);
    });
  });

  describe('getUsageDetails', () => {
    it('should get usage details successfully', async () => {
      const usageResponse = {
        drive: 1024 * 1024 * 100, // 100MB
        backups: 1024 * 1024 * 50, // 50MB
      };
      mockStorageClient.spaceUsageV2.mockResolvedValue(usageResponse);

      const result = await usageService.getUsageDetails();

      expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
      expect(mockStorageClient.spaceUsageV2).toHaveBeenCalled();
      expect(result).toEqual({
        drive: usageResponse.drive,
        photos: 0,
        backups: usageResponse.backups,
      });
    });

    it('should handle errors and report them', async () => {
      const error = new Error('Failed to fetch usage details');
      mockStorageClient.spaceUsageV2.mockRejectedValue(error);

      const result = await usageService.getUsageDetails();

      expect(errorService.reportError).toHaveBeenCalledWith(error);
      expect(result).toEqual({ drive: 0, photos: 0, backups: 0 });
    });
  });

  describe('getUsagePercent', () => {
    it('should calculate usage percentage correctly', () => {
      const usage = 250;
      const limit = 1000;
      const expectedPercent = 25;

      const result = usageService.getUsagePercent(usage, limit);

      expect(result).toBe(expectedPercent);
    });

    it('should round up percentage to nearest integer', () => {
      const usage = 101;
      const limit = 1000;
      const expectedPercent = 11;

      const result = usageService.getUsagePercent(usage, limit);

      expect(result).toBe(expectedPercent);
    });

    it('should handle 100% usage correctly', () => {
      const usage = 1000;
      const limit = 1000;
      const expectedPercent = 100;

      const result = usageService.getUsagePercent(usage, limit);

      expect(result).toBe(expectedPercent);
    });
  });
});
