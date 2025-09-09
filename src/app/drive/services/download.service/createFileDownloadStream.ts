import { DriveFileData } from '../../types';
import fetchFileStream from './fetchFileStream';
import fetchFileStreamUsingCredentials from './fetchFileStreamUsingCredentials';

export default async function createFileDownloadStream(
  itemData: DriveFileData,
  isWorkspace: boolean,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController,
  sharingOptions?: { credentials: { user: string; pass: string }; mnemonic: string },
): Promise<Promise<ReadableStream<Uint8Array<ArrayBufferLike>>>> {
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
          creds: {
            user: sharingOptions.credentials.user,
            pass: sharingOptions.credentials.pass,
          },
          mnemonic: sharingOptions.mnemonic,
        },
      );
}
