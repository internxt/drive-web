import { describe, it, expect, vi, beforeEach, Mock, afterAll } from 'vitest';
import { mapBackupFolder } from './mappers';
import { aes } from '@internxt/lib';
import type { DriveFolderData } from '../../drive/types';
import { envConfig } from 'app/core/services/env.service';

vi.mock('@internxt/lib', () => ({
  aes: {
    decrypt: vi.fn(),
  },
}));

describe('Mapping backup folder', () => {
  const mockedSecret2 = 'my-secret';
  const originalEnvCryptoSecret2 = envConfig.crypto.secret2;

  beforeEach(() => {
    vi.clearAllMocks();
    envConfig.crypto.secret2 = mockedSecret2;
  });

  afterAll(() => {
    vi.restoreAllMocks();
    envConfig.crypto.secret2 = originalEnvCryptoSecret2;
  });

  it('When the plainName parameter is returned, then we use this parameter as name', () => {
    const folder: DriveFolderData = {
      name: 'encrypted-name',
      bucket: 'bucket-1',
      plainName: 'My Folder',
    } as DriveFolderData;

    const result = mapBackupFolder(folder);

    expect(result.name).toBe('My Folder');
    expect(result.isFolder).toBe(true);
  });

  it('When the plainName parameter is not returned, we try to decrypt the encrypted name directly in the client side', () => {
    const decrypted = 'Decrypted Name';
    (aes.decrypt as Mock).mockReturnValue(decrypted);

    const folder: DriveFolderData = {
      name: 'encrypted-name',
      bucket: 'bucket-1',
    } as DriveFolderData;

    const result = mapBackupFolder(folder);

    expect(aes.decrypt).toHaveBeenCalledWith('encrypted-name', 'my-secret-bucket-1');
    expect(result.name).toBe(decrypted);
    expect(result.isFolder).toBe(true);
  });
});
