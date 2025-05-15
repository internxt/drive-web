import { describe, it, expect, vi, beforeEach } from 'vitest';
import limitService from './limit.service';
import { SdkFactory } from '../../core/factory/sdk';
import { HUNDRED_TB } from 'app/core/components/Sidenav/Sidenav';

vi.mock('@internxt/sdk', () => ({
  Network: {},
}));

vi.mock('app/store', () => ({
  default: {
    dispatch: vi.fn(),
    getState: vi.fn(),
  },
}));

vi.mock('app/store/slices/session', () => ({
  sessionActions: {
    resetState: vi.fn(),
  },
}));

vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('./size.service', () => {
  const bytesToStringMock = (size) => {
    return size > 0 ? 'formatted-size' : '';
  };

  return {
    bytesToString: bytesToStringMock,
    default: {
      bytesToString: bytesToStringMock,
    },
  };
});

describe('limitService', () => {
  const mockStorageClient = {
    spaceLimitV2: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    } as any);
  });

  describe('fetchLimit', () => {
    it('should fetch space limit successfully', async () => {
      const maxSpaceBytes = 1024 * 1024 * 1024 * 10; // 10GB
      mockStorageClient.spaceLimitV2.mockResolvedValue({ maxSpaceBytes });

      const result = await limitService.fetchLimit();

      expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
      expect(mockStorageClient.spaceLimitV2).toHaveBeenCalled();
      expect(result).toEqual(maxSpaceBytes);
    });

    it('should handle errors when fetching space limit', async () => {
      const error = new Error('Failed to fetch space limit');
      mockStorageClient.spaceLimitV2.mockRejectedValue(error);

      await expect(limitService.fetchLimit()).rejects.toThrow(error);
    });
  });

  describe('formatLimit', () => {
    it('should return ellipsis for zero or negative limit values', () => {
      expect(limitService.formatLimit(0)).toBe('...');
      expect(limitService.formatLimit(-100)).toBe('...');
    });

    it('should return infinity symbol for limits greater than 100TB', () => {
      const largeLimit = HUNDRED_TB + 1024;
      const result = limitService.formatLimit(largeLimit);
      expect(result).toBe('\u221E');
    });

    it('should format positive values less than 100TB', () => {
      const smallLimit = 1024 * 1024 * 50; // 50MB
      const result = limitService.formatLimit(smallLimit);

      expect(result).not.toBe('...');
      expect(result).not.toBe('\u221E');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
