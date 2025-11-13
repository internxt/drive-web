import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFolder } from './createFolder';
import { CreateFolderResponse, EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import folderService from 'app/drive/services/folder.service';
import tasksService from '../../../../tasks/services/tasks.service';
import errorService from '../../../../core/services/error.service';
import AppError from '../../../../core/types';
import { DriveFolderData } from 'app/drive/types';

vi.mock('..', () => ({
  default: {
    pushItems: vi.fn(),
  },
  storageActions: vi.fn(),
  storageSelectors: vi.fn(),
}));

vi.mock('../../../../core/services/workspace.service', () => ({
  default: {
    createFolder: vi.fn(),
  },
}));

vi.mock('../../../../tasks/services/tasks.service', () => ({
  default: {
    create: vi.fn(),
    updateTask: vi.fn(),
  },
}));

vi.mock('../../../../core/services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
  },
}));

vi.mock('app/drive/services/folder.service', () => ({
  default: {
    createFolderByUuid: vi.fn(),
  },
}));

describe('checkCreateFolder', () => {
  const parentFolderId = 'parent-folder-id';
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should create folder via folderService', async () => {
    const currentFolderId = 'currentFolderId';
    const mockFolder: CreateFolderResponse = {
      id: 0,
      name: 'Folder1',
      parentId: 0,
      plainName: 'Folder1',
      bucket: 'bucket',
      createdAt: new Date(),
      updatedAt: new Date(),
      creationTime: new Date(),
      deleted: false,
      deletedAt: null,
      encryptVersion: EncryptionVersion.Aes03,
      modificationTime: new Date(),
      parentUuid: parentFolderId,
      removed: false,
      removedAt: null,
      userId: 0,
      uuid: 'uuid',
    };

    vi.spyOn(folderService, 'createFolderByUuid').mockReturnValue([Promise.resolve(mockFolder), { cancel: vi.fn() }]);
    vi.spyOn(tasksService, 'create').mockReturnValue('task-id');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue();
    vi.spyOn(errorService, 'castError').mockResolvedValue(new AppError('error'));

    const result = await createFolder(
      {
        folderName: 'Folder1',
        parentFolderId,
        options: { showErrors: true },
      },
      currentFolderId,
      null,
      { dispatch: mockDispatch },
    );

    const mockFolderNormalized: DriveFolderData = {
      ...mockFolder,
      name: 'Folder1',
      parent_id: mockFolder.parentId,
      user_id: mockFolder.userId,
      icon: null,
      iconId: null,
      icon_id: null,
      isFolder: true,
      color: null,
      encrypt_version: null,
      plain_name: mockFolder.plainName,
      deleted: false,
      createdAt: new Date(mockFolder.createdAt || '').toISOString(),
      updatedAt: new Date(mockFolder.updatedAt || '').toISOString(),
    };

    expect(mockFolderNormalized).toStrictEqual(result);
  });
});
