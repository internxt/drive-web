import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { mapBackupFolder } from './mappers';
import { aes } from '@internxt/lib';
import type { DriveFolderData } from 'app/drive/types';
import envService from 'services/env.service';

vi.mock('@internxt/lib', async () => {
  const actual = await vi.importActual<typeof import('@internxt/lib')>('@internxt/lib');
  return {
    ...actual,
    aes: {
      decrypt: vi.fn(),
    },
  };
});

describe('Mapping backup folder', () => {
  const mockedSecret2 = 'my-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'secret2') return mockedSecret2;
      else return 'no mock implementation';
    });
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
