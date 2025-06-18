import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSpaceUsageV2 = vi.fn();
vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createNewStorageClient: vi.fn(() => ({
        spaceUsageV2: mockSpaceUsageV2,
      })),
    })),
  },
}));

import usageService from './usage.service';
import errorService from '../../core/services/error.service';

describe('usageService', () => {
  beforeEach(() => {
    mockSpaceUsageV2.mockReset();
  });

  describe('fetchUsage', () => {
    it('should fetch usage data successfully', async () => {
      mockSpaceUsageV2.mockResolvedValue({ drive: 100, backups: 50 });

      const result = await usageService.fetchUsage();

      expect(mockSpaceUsageV2).toHaveBeenCalled();
      expect(result).toEqual({ drive: 100, backups: 50 });
    });
  });

  describe('getUsageDetails', () => {
    it('should return usage details successfully', async () => {
      mockSpaceUsageV2.mockResolvedValue({ drive: 200, backups: 100 });
      const result = await usageService.getUsageDetails();

      expect(mockSpaceUsageV2).toHaveBeenCalled();
      expect(result).toEqual({ drive: 200, photos: 0, backups: 100 });
    });

    it('should handle errors and return default values', async () => {
      mockSpaceUsageV2.mockRejectedValue(new Error('API error'));
      const reportErrorMock = vi.spyOn(errorService, 'reportError');

      const result = await usageService.getUsageDetails();
      expect(reportErrorMock).toHaveBeenCalledWith(expect.any(Error));
      expect(mockSpaceUsageV2).toHaveBeenCalled();
      expect(reportErrorMock).toHaveBeenCalledWith(new Error('API error'));
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
