import { SdkFactory } from 'app/core/factory/sdk';
import localStorageService from 'services/local-storage.service';
import { downloadFile } from 'app/network/download';
import { binaryStreamToBlob } from 'services/stream.service';
import { saveAs } from 'file-saver';
import { FileVersion } from '../types';

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
  fileName: string,
  bucketId: string,
  updateProgressCallback?: (progress: number) => void,
  abortController?: AbortController,
): Promise<void> {
  const user = localStorageService.getUser();
  if (!user) throw new Error('User not found');

  const fileStream = await downloadFile({
    fileId: version.networkFileId,
    bucketId,
    creds: {
      user: user.bridgeUser,
      pass: user.userId,
    },
    mnemonic: user.mnemonic,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        if (updateProgressCallback) {
          updateProgressCallback(downloadedBytes / totalBytes);
        }
      },
      abortController,
    },
  });

  const blob = await binaryStreamToBlob(fileStream);
  saveAs(blob, fileName);
}

const fileVersionService = {
  getFileVersions,
  deleteVersion,
  restoreVersion,
  downloadVersion,
};

export default fileVersionService;
