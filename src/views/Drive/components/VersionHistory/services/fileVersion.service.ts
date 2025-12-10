import { SdkFactory } from 'app/core/factory/sdk';
import { DownloadManager } from 'app/network/DownloadManager';
import { FileVersion } from '../types';
import { DriveItemData } from 'app/drive/types';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';

const getStorageClient = () => SdkFactory.getNewApiInstance().createNewStorageClient();

export async function getFileVersions(fileUuid: string): Promise<FileVersion[]> {
  return getStorageClient().getFileVersions(fileUuid);
}

export async function deleteVersion(fileUuid: string, versionId: string): Promise<void> {
  await getStorageClient().deleteFileVersion(fileUuid, versionId);
}

export async function restoreVersion(fileUuid: string, versionId: string): Promise<FileVersion> {
  return getStorageClient().restoreFileVersion(fileUuid, versionId);
}

export async function downloadVersion(
  version: FileVersion,
  fileItem: DriveItemData,
  fileName: string,
  selectedWorkspace: WorkspaceData | null,
  workspaceCredentials: WorkspaceCredentialsDetails | null,
): Promise<void> {
  const versionFileData: DriveItemData = {
    ...fileItem,
    fileId: version.networkFileId,
    size: Number(version.size),
    name: fileName,
  };

  await DownloadManager.downloadItem({
    payload: [versionFileData],
    selectedWorkspace,
    workspaceCredentials,
  });
}

const fileVersionService = {
  getFileVersions,
  deleteVersion,
  restoreVersion,
  downloadVersion,
};

export default fileVersionService;
