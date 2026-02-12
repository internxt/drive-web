import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkFactory } from 'app/core/factory/sdk';
import { DownloadManager } from 'app/network/DownloadManager';
import fileVersionService from './fileVersion.service';
import { FileVersion, RestoreFileVersionResponse } from '@internxt/sdk/dist/drive/storage/types';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('app/network/DownloadManager', () => ({
  DownloadManager: {
    downloadItem: vi.fn(),
  },
}));

describe('File version actions', () => {
  const fileUuid = 'file-uuid';
  const versionId = 'version-id';
  let storageClientMock: {
    getFileVersions: ReturnType<typeof vi.fn>;
    deleteFileVersion: ReturnType<typeof vi.fn>;
    restoreFileVersion: ReturnType<typeof vi.fn>;
    getFileVersionLimits: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storageClientMock = {
      getFileVersions: vi.fn(),
      deleteFileVersion: vi.fn(),
      restoreFileVersion: vi.fn(),
      getFileVersionLimits: vi.fn(),
    };

    vi.clearAllMocks();

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: () => storageClientMock,
    } as any);
  });

  it('when file versions are requested, then the available list is returned', async () => {
    const versions = [{ id: 'v1' } as FileVersion];
    storageClientMock.getFileVersions.mockResolvedValueOnce(versions);

    const result = await fileVersionService.getFileVersions(fileUuid);

    expect(storageClientMock.getFileVersions).toHaveBeenCalledWith(fileUuid);
    expect(result).toBe(versions);
  });

  it('when a version is deleted, then the delete request is sent', async () => {
    storageClientMock.deleteFileVersion.mockResolvedValueOnce(undefined);

    await fileVersionService.deleteVersion(fileUuid, versionId);

    expect(storageClientMock.deleteFileVersion).toHaveBeenCalledWith(fileUuid, versionId);
  });

  it('when a version is restored, then the restore response is returned', async () => {
    const restoreResponse = { restored: true } as unknown as RestoreFileVersionResponse;
    storageClientMock.restoreFileVersion.mockResolvedValueOnce(restoreResponse);

    const result = await fileVersionService.restoreVersion(fileUuid, versionId);

    expect(storageClientMock.restoreFileVersion).toHaveBeenCalledWith(fileUuid, versionId);
    expect(result).toBe(restoreResponse);
  });

  it('when versioning limits are checked, then the limits are returned', async () => {
    const limits = { versioning: { enabled: true, maxFileSize: 0, retentionDays: 0, maxVersions: 0 } } as any;
    storageClientMock.getFileVersionLimits.mockResolvedValueOnce(limits);

    const result = await fileVersionService.getLimits();

    expect(storageClientMock.getFileVersionLimits).toHaveBeenCalled();
    expect(result).toBe(limits);
  });

  it('when a previous version is downloaded, then the request uses the version data', async () => {
    const version = { networkFileId: 'network-file-id', size: '42' } as FileVersion;
    const fileItem = { fileId: 'file-id', size: 10, name: 'original-name' } as any;
    const selectedWorkspace = { workspace: { id: 'workspace-id' }, workspaceUser: {} } as unknown as WorkspaceData;
    const workspaceCredentials = {
      workspaceId: 'workspace-id',
      bucket: 'bucket',
      workspaceUserId: 'workspace-user',
      email: 'user@example.com',
      credentials: {} as any,
      tokenHeader: 'token-header',
    } as WorkspaceCredentialsDetails;
    const downloadItemSpy = vi.spyOn(DownloadManager, 'downloadItem').mockResolvedValueOnce(undefined);

    await fileVersionService.downloadVersion(version, fileItem, 'custom-name', selectedWorkspace, workspaceCredentials);

    expect(downloadItemSpy).toHaveBeenCalledWith({
      payload: [
        {
          ...fileItem,
          fileId: version.networkFileId,
          size: Number(version.size),
        },
      ],
      selectedWorkspace,
      workspaceCredentials,
      downloadOptions: {
        downloadName: 'custom-name',
      },
    });
  });
});
