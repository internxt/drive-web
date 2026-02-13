import { StorageTypes } from '@internxt/sdk/dist/drive';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createFileEntry, uploadFile } from './uploadFile';
import { FileToUpload } from './types';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createNewStorageClient: vi.fn(() => ({
        createFileEntryByUuid: vi.fn(),
      })),
    })),
  },
}));

vi.mock('app/drive/services/network.service', () => ({
  Network: vi.fn(),
  getEnvironmentConfig: vi.fn(),
}));

vi.mock('../thumbnail.service', () => ({
  generateThumbnailFromFile: vi.fn(),
}));

vi.mock('services/local-storage.service', () => ({
  default: {
    clear: vi.fn(),
  },
}));

vi.mock('services/navigation.service', () => ({
  default: {
    push: vi.fn(),
  },
}));

import { SdkFactory } from 'app/core/factory/sdk';
import workspacesService from 'services/workspace.service';
import { Network, getEnvironmentConfig } from 'app/drive/services/network.service';
import { BucketNotFoundError, FileIdRequiredError } from './upload.errors';
import { DriveFileData } from 'app/drive/types';

const mockSdkFactory = vi.mocked(SdkFactory);
const mockNetwork = vi.mocked(Network);
const mockGetEnvironmentConfig = vi.mocked(getEnvironmentConfig);

describe('Create File Entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When creating a file entry for a workspace, then the file entry for workspaces should be created', async () => {
    const file: FileToUpload = {
      name: 'test-file',
      size: 1024,
      type: 'pdf',
      content: new File(['content'], 'test-file.pdf'),
      parentFolderId: 'folder-uuid-123',
    };
    const bucketId = 'bucket-123';
    const fileId = 'file-id-123';
    const workspaceId = 'workspace-456';
    const resourcesToken = undefined;

    const expectedResponse = { id: 'created-file-id', name: file.name } as unknown as DriveFileData;
    const workspaceServiceSpy = vi.spyOn(workspacesService, 'createFileEntry').mockResolvedValue(expectedResponse);

    const result = await createFileEntry({
      bucketId,
      fileId,
      file,
      isWorkspaceUpload: true,
      workspaceId,
      resourcesToken,
    });

    expect(result).toEqual(expectedResponse);
    expect(workspaceServiceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: file.name,
        bucket: bucketId,
        fileId: fileId,
        folderUuid: file.parentFolderId,
        size: file.size,
        plainName: file.name,
        type: file.type,
        encryptVersion: StorageTypes.EncryptionVersion.Aes03,
      }),
      workspaceId,
      resourcesToken,
    );
  });

  test('When creating a file entry for a workspace without file Id, then an error indicating so is thrown', async () => {
    const file: FileToUpload = {
      name: 'test-file',
      size: 1024,
      type: 'pdf',
      content: new File(['content'], 'test-file.pdf'),
      parentFolderId: 'folder-uuid-123',
    };

    await expect(
      createFileEntry({
        bucketId: 'bucket-123',
        fileId: undefined,
        file,
        isWorkspaceUpload: true,
        workspaceId: 'workspace-456',
      }),
    ).rejects.toThrow(FileIdRequiredError);
  });

  test('When creating a file entry for personal storage, then the file entry for personal storage should be created', async () => {
    const file: FileToUpload = {
      name: 'personal-file',
      size: 2048,
      type: 'txt',
      content: new File(['content'], 'personal-file.txt'),
      parentFolderId: 'folder-uuid-456',
    };
    const bucketId = 'personal-bucket';
    const fileId = 'personal-file-id';
    const ownerToken = 'owner-token';

    const expectedResponse = { id: 'personal-created-id', name: file.name };
    const mockCreateFileEntryByUuid = vi.fn().mockResolvedValue(expectedResponse);
    mockSdkFactory.getNewApiInstance.mockReturnValue({
      createNewStorageClient: vi.fn(() => ({
        createFileEntryByUuid: mockCreateFileEntryByUuid,
      })),
    } as any);

    const result = await createFileEntry({
      bucketId,
      fileId,
      file,
      isWorkspaceUpload: false,
      ownerToken,
    });

    expect(result).toEqual(expectedResponse);
    expect(mockCreateFileEntryByUuid).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: fileId,
        type: file.type,
        size: file.size,
        plainName: file.name,
        bucket: bucketId,
        folderUuid: file.parentFolderId,
        encryptVersion: StorageTypes.EncryptionVersion.Aes03,
      }),
      ownerToken,
    );
  });

  test('When creating a file entry for personal storage and a resources token is present, then the file entry for personal storage should be created using that token', async () => {
    const file: FileToUpload = {
      name: 'personal-file',
      size: 2048,
      type: 'txt',
      content: new File(['content'], 'personal-file.txt'),
      parentFolderId: 'folder-uuid-456',
    };
    const bucketId = 'personal-bucket';
    const fileId = 'personal-file-id';
    const resourcesToken = 'resources-token';
    const ownerToken = 'owner-token';

    const expectedResponse = { id: 'personal-created-id', name: file.name };
    const mockCreateFileEntryByUuid = vi.fn().mockResolvedValue(expectedResponse);
    mockSdkFactory.getNewApiInstance.mockReturnValue({
      createNewStorageClient: vi.fn(() => ({
        createFileEntryByUuid: mockCreateFileEntryByUuid,
      })),
    } as any);

    const result = await createFileEntry({
      bucketId,
      fileId,
      file,
      isWorkspaceUpload: false,
      resourcesToken,
      ownerToken,
    });

    expect(result).toEqual(expectedResponse);
    expect(mockCreateFileEntryByUuid).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: fileId,
        type: file.type,
        size: file.size,
        plainName: file.name,
        bucket: bucketId,
        folderUuid: file.parentFolderId,
        encryptVersion: StorageTypes.EncryptionVersion.Aes03,
      }),
      resourcesToken,
    );
  });
});

describe('Uploading a file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When uploading a workspace file with resources token, then should be used to create a file entry', async () => {
    const file: FileToUpload = {
      name: 'test-file',
      size: 1024,
      type: 'pdf',
      content: new File(['content'], 'test-file.pdf'),
      parentFolderId: 'folder-uuid-123',
    };
    const bucketId = 'bucket-123';
    const resourcesToken = 'actual-resources-token';
    const workspacesToken = 'workspaces-token';
    const workspaceId = 'workspace-123';

    const expectedResponse = { id: 'file-id', name: file.name, uuid: 'uuid-123', thumbnails: [] };
    const workspaceServiceSpy = vi
      .spyOn(workspacesService, 'createFileEntry')
      .mockResolvedValue(expectedResponse as unknown as DriveFileData);

    const mockUploadFile = vi.fn().mockReturnValue([Promise.resolve('file-id-123'), { abort: vi.fn() }]);
    mockNetwork.mockImplementation(
      () =>
        ({
          uploadFile: mockUploadFile,
        }) as any,
    );

    await uploadFile(
      'user@test',
      file,
      vi.fn(),
      {
        isTeam: false,
        ownerUserAuthenticationData: {
          bridgePass: 'pass',
          bridgeUser: 'user',
          encryptionKey: 'key',
          bucketId,
          token: 'token',
          resourcesToken,
          workspaceId,
          workspacesToken,
        },
      },
      { taskId: 'task-1', isPaused: false, isRetriedUpload: false },
    );

    expect(workspaceServiceSpy).toHaveBeenCalledWith(expect.any(Object), workspaceId, resourcesToken);
  });

  test('When uploading a workspace file without resources token, then it should not be used to create a file entry', async () => {
    const file: FileToUpload = {
      name: 'test-file',
      size: 1024,
      type: 'pdf',
      content: new File(['content'], 'test-file.pdf'),
      parentFolderId: 'folder-uuid-123',
    };
    const bucketId = 'bucket-123';
    const resourcesToken = undefined;
    const workspaceId = 'workspace-123';
    const workspacesToken = 'workspaces-token';

    const expectedResponse = { id: 'file-id', name: file.name, uuid: 'uuid-123', thumbnails: [] };
    const workspaceServiceSpy = vi
      .spyOn(workspacesService, 'createFileEntry')
      .mockResolvedValue(expectedResponse as unknown as DriveFileData);

    const mockUploadFile = vi.fn().mockReturnValue([Promise.resolve('file-id-123'), { abort: vi.fn() }]);
    mockNetwork.mockImplementation(
      () =>
        ({
          uploadFile: mockUploadFile,
        }) as any,
    );

    await uploadFile(
      'user@test',
      file,
      vi.fn(),
      {
        isTeam: false,
        ownerUserAuthenticationData: {
          bridgePass: 'pass',
          bridgeUser: 'user',
          encryptionKey: 'key',
          bucketId,
          token: 'token',
          resourcesToken,
          workspaceId,
          workspacesToken,
        },
      },
      { taskId: 'task-1', isPaused: false, isRetriedUpload: false },
    );

    expect(workspaceServiceSpy).toHaveBeenCalledWith(expect.any(Object), workspaceId, resourcesToken);
  });

  test('When uploading a file with size 0 and no workspace, then it should create file entry directly without uploading', async () => {
    const file: FileToUpload = {
      name: 'empty-file',
      size: 0,
      type: 'txt',
      content: new File([], 'empty-file.txt'),
      parentFolderId: 'folder-123',
    };
    const bucketId = 'bucket-123';

    mockGetEnvironmentConfig.mockReturnValue({
      bridgeUser: 'user',
      bridgePass: 'pass',
      encryptionKey: 'key',
      bucketId,
    } as any);

    const expectedResponse = { id: 'empty-file-id', name: file.name, uuid: 'uuid-123', thumbnails: [] };
    const mockCreateFileEntryByUuid = vi.fn().mockResolvedValue(expectedResponse);
    mockSdkFactory.getNewApiInstance.mockReturnValue({
      createNewStorageClient: vi.fn(() => ({
        createFileEntryByUuid: mockCreateFileEntryByUuid,
      })),
    } as any);

    const result = await uploadFile(
      'user@test.com',
      file,
      vi.fn(),
      { isTeam: false },
      { taskId: 'task-1', isPaused: false, isRetriedUpload: false },
    );

    expect(result).toEqual(expectedResponse);
    expect(mockNetwork).not.toHaveBeenCalled();
  });

  test('When uploading a file without bucket id, then an error indicating so is thrown', async () => {
    const file: FileToUpload = {
      name: 'test-file',
      size: 1024,
      type: 'pdf',
      content: new File(['content'], 'test-file.pdf'),
      parentFolderId: 'folder-123',
    };

    mockGetEnvironmentConfig.mockReturnValue({
      bridgeUser: 'user',
      bridgePass: 'pass',
      encryptionKey: 'key',
      bucketId: undefined,
    } as any);

    await expect(
      uploadFile(
        'user@test.com',
        file,
        vi.fn(),
        { isTeam: false },
        { taskId: 'task-1', isPaused: false, isRetriedUpload: false },
      ),
    ).rejects.toThrow(BucketNotFoundError);
  });

  test('When a file has been uploaded and the file ID is undefined, then an error indicating so is thrown', async () => {
    const file: FileToUpload = {
      name: 'test-file',
      size: 100,
      type: 'txt',
      content: new File(['some content'], 'test-file.txt'),
      parentFolderId: 'folder-123',
    };
    const bucketId = 'bucket-123';

    mockGetEnvironmentConfig.mockReturnValue({
      bridgeUser: 'user',
      bridgePass: 'pass',
      encryptionKey: 'key',
      bucketId,
    } as any);

    const mockUploadFile = vi.fn().mockReturnValue([Promise.resolve(undefined), { abort: vi.fn() }]);
    mockNetwork.mockImplementation(
      () =>
        ({
          uploadFile: mockUploadFile,
        }) as any,
    );

    await expect(
      uploadFile(
        'user@test.com',
        file,
        vi.fn(),
        { isTeam: false },
        { taskId: 'task-1', isPaused: false, isRetriedUpload: false },
      ),
    ).rejects.toThrow(FileIdRequiredError);
  });
});
