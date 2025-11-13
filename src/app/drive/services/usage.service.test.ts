import { describe, expect, it, Mock, vi } from 'vitest';
import usageService from './usage.service';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'app/core/services/error.service';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('app/core/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

describe('usageService', () => {
  describe('fetchUsage', () => {
    it('should fetch usage data successfully', async () => {
      const mockSpaceUsageV2 = vi.fn().mockResolvedValue({ drive: 100, backups: 50 });
      const mockStorageClient = { spaceUsageV2: mockSpaceUsageV2 };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      const result = await usageService.fetchUsage();

      expect(mockSpaceUsageV2).toHaveBeenCalled();
      expect(result).toEqual({ drive: 100, backups: 50 });
    });
  });

  describe('getUsageDetails', () => {
    it('should return usage details successfully', async () => {
      const mockSpaceUsageV2 = vi.fn().mockResolvedValue({ drive: 200, backups: 100 });
      const mockStorageClient = { spaceUsageV2: mockSpaceUsageV2 };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      const result = await usageService.getUsageDetails();

      expect(mockSpaceUsageV2).toHaveBeenCalled();
      expect(result).toEqual({ drive: 200, photos: 0, backups: 100 });
    });

    it('should handle errors and return default values', async () => {
      const mockSpaceUsageV2 = vi.fn().mockRejectedValue(new Error('API error'));
      const mockStorageClient = { spaceUsageV2: mockSpaceUsageV2 };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      const result = await usageService.getUsageDetails();
      expect(errorService.reportError).toHaveBeenCalledWith(expect.any(Error));
      expect(mockSpaceUsageV2).toHaveBeenCalled();
      expect(errorService.reportError).toHaveBeenCalledWith(new Error('API error'));
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
