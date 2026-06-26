import { multipartDownloadFile } from 'app/network/download';
import { DriveFileData } from '../../types';
import { FileKey, NetworkCredentials } from 'app/network/types/helper-types';

export default async function createMultipartFileDownloadStream(
  itemData: DriveFileData,
  updateProgressCallback: (progress: number) => void,
  sharingOptions: { credentials: NetworkCredentials; key: FileKey },
  abortController?: AbortController,
): Promise<ReadableStream<Uint8Array>> {
  return multipartDownloadFile({
    bucketId: itemData.bucket,
    fileId: itemData.fileId,
    creds: sharingOptions?.credentials,
    key: sharingOptions?.key,
    fileSize: itemData.size,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        updateProgressCallback(downloadedBytes / totalBytes);
      },
      abortController,
    },
  });
}
