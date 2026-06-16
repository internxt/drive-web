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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      return 'no mock implementation';
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
});
