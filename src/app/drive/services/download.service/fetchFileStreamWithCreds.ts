import { downloadFile, Downloadable } from 'app/network/download';

type FetchFileStreamOptions = {
  updateProgressCallback: (progress: number) => void;
  isTeam?: boolean;
  abortController?: AbortController;
  creds: {
    user: string;
    pass: string;
  };
  mnemonic: string;
};

export default function fetchFileStreamWithCreds(
  item: Downloadable,
  options: FetchFileStreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  return downloadFile({
    fileId: item.fileId,
    bucketId: item.bucketId,
    creds: {
      user: options.creds.user,
      pass: options.creds.pass,
    },
    mnemonic: options.mnemonic,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        const progress = downloadedBytes / totalBytes;
        options.updateProgressCallback(progress);
      },
    },
  });
}
