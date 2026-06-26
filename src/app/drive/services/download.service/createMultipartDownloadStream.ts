import { multipartDownloadFile } from 'app/network/download';
import { DriveFileData } from '../../types';
import { NetworkCredentials } from 'app/network/types/helper-types';

export default async function createMultipartFileDownloadStream(
  itemData: DriveFileData,
  updateProgressCallback: (progress: number) => void,
  sharingOptions: { credentials: NetworkCredentials; mnemonic: string },
  abortController?: AbortController,
): Promise<ReadableStream<Uint8Array>> {
  return multipartDownloadFile({
    bucketId: itemData.bucket,
    fileId: itemData.fileId,
    creds: sharingOptions?.credentials,
    key: { mnemonic: sharingOptions?.mnemonic },
    fileSize: itemData.size,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        updateProgressCallback(downloadedBytes / totalBytes);
      },
      abortController,
    },
  });
}
