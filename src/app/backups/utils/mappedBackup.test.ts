import { describe, it, expect, vi, beforeEach, afterAll, Mock } from 'vitest';
import { mappedBackup } from './mappedBackup';
import { aes } from '@internxt/lib';
import type { DriveFolderData } from '../../drive/types';

vi.mock('@internxt/lib', () => ({
  aes: {
    decrypt: vi.fn(),
  },
}));

describe('Mapping backup folder', () => {
  const secret = 'my-secret';
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, REACT_APP_CRYPTO_SECRET2: secret };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('When the plainName parameter is returned, then we use this parameter as name', () => {
    const folder: DriveFolderData = {
      name: 'encrypted-name',
      bucket: 'bucket-1',
      plainName: 'My Folder',
    } as DriveFolderData;

    const result = mappedBackup(folder);

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

    const result = mappedBackup(folder);

    expect(aes.decrypt).toHaveBeenCalledWith('encrypted-name', 'my-secret-bucket-1');
    expect(result.name).toBe(decrypted);
    expect(result.isFolder).toBe(true);
  });
});
