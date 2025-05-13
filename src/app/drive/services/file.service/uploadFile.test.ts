import { describe, it, expect, vi, beforeEach } from 'vitest';
import uploadFile from './uploadFile';
import { Network, getEnvironmentConfig } from '../network.service';
import navigationService from '../../../core/services/navigation.service';
import localStorageService from '../../../core/services/local-storage.service';
import notificationsService from '../../../notifications/services/notifications.service';
import { SdkFactory } from '../../../core/factory/sdk';
import * as thumbnailService from '../thumbnail.service';
import workspacesService from '../../../core/services/workspace.service';

vi.mock('../network.service', () => ({
  Network: vi.fn(),
  getEnvironmentConfig: vi.fn(),
}));

vi.mock('../../../core/services/navigation.service', () => ({
  default: {
    push: vi.fn(),
  },
}));

vi.mock('../../../core/services/local-storage.service', () => ({
  default: {
    clear: vi.fn(),
  },
}));

vi.mock('../../../notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Warning: 'warning',
  },
}));

vi.mock('../../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
    getInstance: vi.fn(),
  },
}));

vi.mock('../thumbnail.service', () => ({
  generateThumbnailFromFile: vi.fn(),
}));

vi.mock('../../../core/services/workspace.service', () => ({
  default: {
    createFileEntry: vi.fn(),
  },
}));

describe('uploadFile', () => {
  const mockFile = {
    content: new File(['test content'], 'test.txt', { type: 'text/plain' }),
    name: 'test.txt',
    size: 12,
    type: 'text/plain',
    parentFolderId: 'parent-folder-uuid',
  };

  const mockBucketId = 'bucket-123';
  const mockFileId = 'file-id-123';
  const mockUserEmail = 'test@example.com';
  const mockEnvironmentConfig = {
    bridgeUser: 'user',
    bridgePass: 'pass',
    encryptionKey: 'key',
    bucketId: mockBucketId,
  };

  const mockStorageClient = {
    createFileEntryByUuid: vi.fn(),
  };

  const mockUpdateProgressCallback = vi.fn();
  const mockUploadPromise = Promise.resolve(mockFileId);
  const mockUploadAbort = { abort: vi.fn() };
  const mockNetworkUploadFile = vi.fn().mockReturnValue([mockUploadPromise, mockUploadAbort]);

  beforeEach(() => {
    vi.clearAllMocks();

    (Network as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      uploadFile: mockNetworkUploadFile,
    }));

    (getEnvironmentConfig as ReturnType<typeof vi.fn>).mockReturnValue(mockEnvironmentConfig);

    const mockNewApiInstance = {
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    };
    (SdkFactory.getNewApiInstance as ReturnType<typeof vi.fn>).mockReturnValue(mockNewApiInstance);
  });

  it('should throw an error if bucketId is not found', async () => {
    (getEnvironmentConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockEnvironmentConfig,
      bucketId: null,
    });

    await expect(
      uploadFile(
        mockUserEmail,
        mockFile,
        mockUpdateProgressCallback,
        { isTeam: false },
        { taskId: 'task-id', isPaused: false, isRetriedUpload: false },
      ),
    ).rejects.toThrow('Bucket not found!');

    expect(notificationsService.show).toHaveBeenCalled();
    expect(localStorageService.clear).toHaveBeenCalled();
    expect(navigationService.push).toHaveBeenCalled();
  });

  it('should upload a file and create a file entry', async () => {
    const mockResponse = {
      id: 123,
      uuid: 'file-uuid-123',
      thumbnails: [],
    };
    mockStorageClient.createFileEntryByUuid.mockResolvedValue(mockResponse);
    (thumbnailService.generateThumbnailFromFile as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await uploadFile(
      mockUserEmail,
      mockFile,
      mockUpdateProgressCallback,
      { isTeam: false },
      { taskId: 'task-id', isPaused: false, isRetriedUpload: false },
    );

    expect(mockNetworkUploadFile).toHaveBeenCalledWith(
      mockBucketId,
      expect.objectContaining({
        filecontent: mockFile.content,
        filesize: mockFile.size,
      }),
      { taskId: 'task-id', isPaused: false, isRetriedUpload: false },
    );

    expect(mockStorageClient.createFileEntryByUuid).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockFileId,
        name: mockFile.name,
        folder_id: mockFile.parentFolderId,
      }),
      undefined,
    );

    expect(result).toEqual(mockResponse);
  });

  it('should handle workspace file uploads', async () => {
    const mockWorkspaceId = 'workspace-123';
    const workspacesToken = 'workspace-token';
    const resourcesToken = 'resources-token';
    const mockResponse = {
      id: 123,
      uuid: 'file-uuid-123',
      thumbnails: [],
    };

    (workspacesService.createFileEntry as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    (thumbnailService.generateThumbnailFromFile as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // For workspace uploads, we need to set the owner authentication data AND mock the environment config
    const ownerAuthData = {
      workspaceId: mockWorkspaceId,
      workspacesToken,
      resourcesToken,
      bridgeUser: 'workspace-user',
      bridgePass: 'workspace-pass',
      encryptionKey: 'workspace-key',
      bucketId: 'workspace-bucket',
      token: 'workspace-access-token',
    };

    const result = await uploadFile(
      mockUserEmail,
      mockFile,
      mockUpdateProgressCallback,
      {
        isTeam: false,
        ownerUserAuthenticationData: ownerAuthData,
      },
      { taskId: 'task-id', isPaused: false, isRetriedUpload: false },
    );

    expect(workspacesService.createFileEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        name: mockFile.name,
        fileId: mockFileId,
        folderUuid: mockFile.parentFolderId,
      }),
      mockWorkspaceId,
      resourcesToken,
    );

    expect(result).toEqual(mockResponse);
  });

  it('should generate and attach a thumbnail when possible', async () => {
    const mockFileResponse = {
      id: 123,
      uuid: 'file-uuid-123',
      thumbnails: [],
    };

    const mockThumbnail = {
      id: 'thumbnail-id',
      bucket_id: 'bucket-id',
      bucket_file: 'bucket-file',
    };

    const mockThumbnailFile = new File(['thumbnail content'], 'thumbnail.jpg');

    mockStorageClient.createFileEntryByUuid.mockResolvedValue(mockFileResponse);
    (thumbnailService.generateThumbnailFromFile as ReturnType<typeof vi.fn>).mockResolvedValue({
      thumbnail: mockThumbnail,
      thumbnailFile: mockThumbnailFile,
    });

    const result = await uploadFile(
      mockUserEmail,
      mockFile,
      mockUpdateProgressCallback,
      { isTeam: false },
      { taskId: 'task-id', isPaused: false, isRetriedUpload: false },
    );

    expect(thumbnailService.generateThumbnailFromFile).toHaveBeenCalledWith(
      mockFile,
      mockFileResponse.id,
      mockFileResponse.uuid,
      mockUserEmail,
      false,
    );

    expect(result.thumbnails).toContain(mockThumbnail);
    expect(result.currentThumbnail).toBe(mockThumbnail);
    expect(result.currentThumbnail?.urlObject).toBeDefined();
  });
});
