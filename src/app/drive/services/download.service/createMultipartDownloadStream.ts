import { multipartDownloadFile } from 'app/network/download';
import { DriveFileData } from '../../types';

export default async function createMultipartFileDownloadStream(
  itemData: DriveFileData,
  updateProgressCallback: (progress: number) => void,
  sharingOptions: { credentials: { user: string; pass: string }; mnemonic: string },
  abortController?: AbortController,
): Promise<ReadableStream<Uint8Array<ArrayBufferLike>>> {
  return multipartDownloadFile({
    bucketId: itemData.bucket,
    fileId: itemData.fileId,
    creds: sharingOptions?.credentials,
    mnemonic: sharingOptions?.mnemonic,
    fileSize: itemData.size,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        updateProgressCallback(downloadedBytes / totalBytes);
      },
      abortController,
    },
  });
}
