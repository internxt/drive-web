import { multipartDownloadFile } from 'app/network/download';
import { DriveFileData } from '../../types';
import { getEnvironmentConfig } from '../network.service';

export default async function createMultipartFileDownloadStream(
  itemData: DriveFileData,
  updateProgressCallback: (progress: number) => void,
  isWorkspace: boolean,
  abortController?: AbortController,
  sharingOptions?: { credentials: { user: string; pass: string }; mnemonic: string },
): Promise<ReadableStream<Uint8Array<ArrayBufferLike>>> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!isWorkspace);

  const credentials = sharingOptions
    ? {
        user: sharingOptions.credentials.user,
        pass: sharingOptions.credentials.pass,
      }
    : {
        user: bridgeUser,
        pass: bridgePass,
      };

  const mnemonic = sharingOptions?.mnemonic ?? encryptionKey;

  return multipartDownloadFile({
    bucketId: itemData.bucket,
    fileId: itemData.fileId,
    creds: credentials,
    mnemonic,
    fileSize: itemData.size,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        updateProgressCallback(downloadedBytes / totalBytes);
      },
      abortController,
    },
  });
}
