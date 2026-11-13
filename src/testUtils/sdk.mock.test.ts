import { describe, expect, it, vi } from 'vitest';
import { SdkFactory } from 'app/core/factory/sdk';
import { mockSdkFactory } from './sdk.mock';

describe('Mock SDK factory', () => {
  it('When a client is given, then the factory returns it', () => {
    const deleteItemsPermanentlyByUUID = vi.fn();

    mockSdkFactory({ createTrashClient: { deleteItemsPermanentlyByUUID } });

    expect(SdkFactory.getNewApiInstance().createTrashClient()).toStrictEqual({ deleteItemsPermanentlyByUUID });
  });

  it('When a client is given, then its factory method is a spy the test can check', () => {
    const { createShareClient } = mockSdkFactory({ createShareClient: {} });

    SdkFactory.getNewApiInstance().createShareClient('captcha-token');

    expect(createShareClient).toHaveBeenCalledWith('captcha-token');
  });

  it('When several clients are given, then each factory method returns its own client', () => {
    const login = vi.fn();
    const getUsage = vi.fn();

    mockSdkFactory({ createAuthClient: { login }, createNewStorageClient: { spaceUsageV2: getUsage } });

    expect(SdkFactory.getNewApiInstance().createAuthClient()).toStrictEqual({ login });
    expect(SdkFactory.getNewApiInstance().createNewStorageClient()).toStrictEqual({ spaceUsageV2: getUsage });
  });
});
