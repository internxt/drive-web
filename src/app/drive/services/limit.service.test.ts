import { describe, it, expect, vi, Mock } from 'vitest';
import { SdkFactory } from '../../core/factory/sdk';
import limitService from './limit.service';

vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

describe('limitService', () => {
  describe('fetchLimit', () => {
    it('should fetch the space limit from the storage client', async () => {
      const expectedLimit = 50000;
      const mockResponse = vi.fn().mockResolvedValue({ maxSpaceBytes: expectedLimit });
      const mockStorageClient = { spaceLimitV2: mockResponse };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      const result = await limitService.fetchLimit();

      expect(mockStorageClient.spaceLimitV2).toHaveBeenCalled();
      expect(result).toEqual(expectedLimit);
    });
  });
});
