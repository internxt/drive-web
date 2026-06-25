import { FileKey, NetworkCredentials } from 'app/drive/types/helper-types';
import { DriveFileData } from '../../types';
import fetchFileStream from './fetchFileStream';
import fetchFileStreamUsingCredentials from './fetchFileStreamUsingCredentials';

export default async function createFileDownloadStream(
  itemData: DriveFileData,
  isWorkspace: boolean,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController,
  sharingOptions?: { credentials: NetworkCredentials; key: FileKey },
): Promise<ReadableStream<Uint8Array>> {
  return !sharingOptions
    ? fetchFileStream(
        { ...itemData, bucketId: itemData.bucket },
        { isWorkspace, updateProgressCallback, abortController },
      )
    : fetchFileStreamUsingCredentials(
        { ...itemData, bucketId: itemData.bucket },
        {
          updateProgressCallback,
          abortController,
          creds: sharingOptions.credentials,
          key: sharingOptions.key,
        },
      );
}
