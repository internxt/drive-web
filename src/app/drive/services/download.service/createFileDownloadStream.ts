import { multipartDownloadFile } from 'app/network/download';
import { DriveFileData } from '../../types';

export default async function createFileDownloadStream(
  itemData: DriveFileData,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController,
  sharingOptions?: { credentials: { user: string; pass: string }; mnemonic: string },
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
