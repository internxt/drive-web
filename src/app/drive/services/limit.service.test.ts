import { describe, it, expect, vi, beforeEach } from 'vitest';
import limitService from './limit.service';
import { mockSdkFactory } from 'testUtils/sdk.mock';

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

    mockSdkFactory({ createNewStorageClient: storageClientMock });
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
