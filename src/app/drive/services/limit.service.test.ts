import { describe, it, expect, vi, beforeEach } from 'vitest';

const expectedLimit = 50000;
const spaceLimitV2Mock = vi.fn().mockResolvedValue({ maxSpaceBytes: expectedLimit });

vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createNewStorageClient: vi.fn(() => ({
        spaceLimitV2: spaceLimitV2Mock,
      })),
    })),
  },
}));
import limitService from './limit.service';

describe('limitService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });
  it('should fetch the space limit from the storage client', async () => {
    const result = await limitService.fetchLimit();

    expect(spaceLimitV2Mock).toHaveBeenCalled();
    expect(result).toEqual(expectedLimit);
  });
});
