import { NetworkCredentials } from 'app/network/types/helper-types';
import { downloadFile, Downloadable } from 'app/network/download';

type FetchFileStreamOptions = {
  updateProgressCallback: (progress: number) => void;
  isTeam?: boolean;
  abortController?: AbortController;
  creds: NetworkCredentials;
  mnemonic: string;
};

export default function fetchFileStreamUsingCredentials(
  item: Downloadable,
  options: FetchFileStreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  return downloadFile({
    fileId: item.fileId,
    bucketId: item.bucketId,
    creds: options.creds,
    key: { mnemonic: options.mnemonic },
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        const progress = downloadedBytes / totalBytes;
        options.updateProgressCallback(progress);
      },
    },
  });
}
