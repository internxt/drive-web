import { Downloadable, downloadFile } from 'app/network/download';
import { getEnvironmentConfig } from '../network.service';

type FetchFileStreamOptions = {
  updateProgressCallback: (progress: number) => void;
  isWorkspace?: boolean;
  abortController?: AbortController;
};

export default function fetchFileStream(
  item: Downloadable,
  options: FetchFileStreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isWorkspace);

  return downloadFile({
    bucketId: item.bucketId,
    fileId: item.fileId,
    creds: {
      pass: bridgePass,
      user: bridgeUser,
    },
    mnemonic: encryptionKey,
    options: {
      notifyProgress: (totalBytes: number, downloadedBytes: number) => {
        options.updateProgressCallback(downloadedBytes / totalBytes);
      },
      abortController: options.abortController,
    },
  });
}
