import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SdkFactory } from 'app/core/factory/sdk';
import limitService from './limit.service';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));
const spaceLimitMock = vi.fn();
describe('limitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    const storageClientMock = {
      spaceLimitV2: spaceLimitMock,
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: () => storageClientMock,
    } as any);
  });
  describe('fetchLimit', () => {
    it('should fetch the space limit from the storage client', async () => {
      const expectedLimit = 50000;
      spaceLimitMock.mockResolvedValue({ maxSpaceBytes: expectedLimit });

      const result = await limitService.fetchLimit();

      expect(spaceLimitMock).toHaveBeenCalled();
      expect(result).toEqual(expectedLimit);
    });
  });
});
