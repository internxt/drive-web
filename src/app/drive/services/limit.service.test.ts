import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SdkFactory } from '../../core/factory/sdk';
import limitService from './limit.service';

describe('limitService', () => {
  const spaceLimitMock = vi.fn();
  beforeEach(() => {
    const storageClientMock = {
      spaceLimitV2: spaceLimitMock,
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: () => storageClientMock,
    } as any);
  });
  it('should fetch the space limit from the storage client', async () => {
    const expectedLimit = 50000;
    spaceLimitMock.mockResolvedValue({ maxSpaceBytes: expectedLimit });

    const result = await limitService.fetchLimit();

    expect(spaceLimitMock).toHaveBeenCalled();
    expect(result).toEqual(expectedLimit);
  });
});
