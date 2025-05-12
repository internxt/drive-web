import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadThumbnail } from './thumbnail.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { AppView } from '../../core/types';

vi.mock('./network.service', () => ({
  getEnvironmentConfig: vi.fn(),
  MAX_ALLOWED_UPLOAD_SIZE: 40 * 1024 * 1024 * 1024, // 40GB
  Network: class MockNetwork {
    uploadFile = vi.fn();
    downloadFile = vi.fn();
    getFileInfo = vi.fn();
  },
}));

vi.mock('app/network/upload', () => ({
  uploadFile: vi.fn(),
  uploadFileBlob: vi.fn(),
}));

// Mock app/store and related modules to prevent circular dependencies
vi.mock('app/store', () => ({
  AppDispatch: vi.fn(),
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    patchItem: vi.fn(),
  },
}));

vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: {
    createFolderThunk: vi.fn(),
    renameItemThunk: vi.fn(),
    moveItemsThunk: vi.fn(),
    deleteItemsThunk: vi.fn(),
  },
}));

vi.mock('../../notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
    Info: 'info',
  },
}));

vi.mock('../../core/services/local-storage.service', () => ({
  default: {
    clear: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  STORAGE_KEYS: {
    TUTORIAL_COMPLETED_ID: 'signUpTutorialCompleted',
    B2B_WORKSPACE: 'b2bWorkspace',
    WORKSPACE_CREDENTIALS: 'workspace_credentials',
    FOLDER_ACCESS_TOKEN: 'folderAccessToken',
    FILE_ACCESS_TOKEN: 'fileAccessToken',
  },
}));

vi.mock('../../core/services/navigation.service', () => ({
  default: {
    push: vi.fn(),
  },
}));

vi.mock('@internxt/sdk/dist/drive', () => ({
  StorageTypes: {
    EncryptionVersion: {
      Aes03: 'AES03',
    },
  },
}));

vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('react-pdf', () => ({
  pdfjs: {
    getDocument: vi.fn().mockReturnValue({
      promise: Promise.resolve({
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn().mockReturnValue({}),
          render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        }),
        destroy: vi.fn(),
      }),
    }),
    GlobalWorkerOptions: { workerSrc: '' },
  },
}));

vi.mock('react-image-file-resizer', () => ({
  default: {
    imageFileResizer: vi.fn(),
  },
}));

vi.mock('./download.service/fetchFileBlob', () => ({
  default: vi.fn(),
}));

import { getEnvironmentConfig } from './network.service';
import * as uploadModule from 'app/network/upload';
import { SdkFactory } from '../../core/factory/sdk';
import localStorageService from '../../core/services/local-storage.service';
import navigationService from '../../core/services/navigation.service';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';

interface MockEnvironmentConfig {
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  bucketId: string | null;
  useProxy: boolean;
}

describe('uploadThumbnail', () => {
  const userEmail = 'test@example.com';
  const thumbnailToUpload = {
    fileId: 1,
    fileUuid: 'uuid-123',
    size: 1024,
    max_width: 100,
    max_height: 100,
    type: 'jpeg',
    content: new File(['dummy content'], 'thumbnail.jpg', { type: 'image/jpeg' }),
  };
  const isTeam = false;
  const updateProgressCallback = vi.fn();
  const abortController = new AbortController();
  const mockCreateThumbnailEntryWithUUID = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue({
        createThumbnailEntryWithUUID: mockCreateThumbnailEntryWithUUID,
      }),
    } as any);
  });

  it('should upload a thumbnail successfully', async () => {
    const mockEnvConfig: MockEnvironmentConfig = {
      bridgeUser: 'user',
      bridgePass: 'pass',
      encryptionKey: 'key',
      bucketId: 'bucket-123',
      useProxy: false,
    };

    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvConfig as any);
    vi.mocked(uploadModule.uploadFile).mockResolvedValue('bucket-file-id');
    mockCreateThumbnailEntryWithUUID.mockResolvedValue({ id: 'thumbnail-id' });

    const result = await uploadThumbnail(userEmail, thumbnailToUpload, isTeam, updateProgressCallback, abortController);

    expect(getEnvironmentConfig).toHaveBeenCalledWith(isTeam);
    expect(uploadModule.uploadFile).toHaveBeenCalledWith(mockEnvConfig.bucketId, {
      creds: {
        user: mockEnvConfig.bridgeUser,
        pass: mockEnvConfig.bridgePass,
      },
      filecontent: thumbnailToUpload.content,
      filesize: thumbnailToUpload.size,
      mnemonic: mockEnvConfig.encryptionKey,
      progressCallback: expect.any(Function),
      abortController,
    });
    expect(mockCreateThumbnailEntryWithUUID).toHaveBeenCalledWith({
      fileId: thumbnailToUpload.fileId,
      fileUuid: thumbnailToUpload.fileUuid,
      maxWidth: thumbnailToUpload.max_width,
      maxHeight: thumbnailToUpload.max_height,
      type: thumbnailToUpload.type,
      size: thumbnailToUpload.size,
      bucketId: mockEnvConfig.bucketId,
      bucketFile: 'bucket-file-id',
      encryptVersion: StorageTypes.EncryptionVersion.Aes03,
    });
    expect(result).toEqual({ id: 'thumbnail-id' });
    expect(notificationsService.show).not.toHaveBeenCalled();
    expect(localStorageService.clear).not.toHaveBeenCalled();
    expect(navigationService.push).not.toHaveBeenCalled();
  });

  it('should throw an error and show notification if bucketId is not found', async () => {
    const mockEnvConfig: MockEnvironmentConfig = {
      bridgeUser: 'user',
      bridgePass: 'pass',
      encryptionKey: 'key',
      bucketId: null,
      useProxy: false,
    };

    vi.mocked(getEnvironmentConfig).mockReturnValue(mockEnvConfig as any);

    await expect(
      uploadThumbnail(userEmail, thumbnailToUpload, isTeam, updateProgressCallback, abortController),
    ).rejects.toThrow('Bucket not found!');

    expect(getEnvironmentConfig).toHaveBeenCalledWith(isTeam);
    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'Login again to start uploading files',
      type: ToastType.Warning,
    });
    expect(localStorageService.clear).toHaveBeenCalled();
    expect(navigationService.push).toHaveBeenCalledWith(AppView.Login);
    expect(uploadModule.uploadFile).not.toHaveBeenCalled();
    expect(mockCreateThumbnailEntryWithUUID).not.toHaveBeenCalled();
  });
});
