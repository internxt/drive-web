import { getEnvironmentConfig } from '../network.service';
import { downloadFile, Downloadable } from 'app/network/download';

type FetchFileStreamOptions = {
  updateProgressCallback: (progress: number) => void;
  isTeam?: boolean,
  abortController?: AbortController
};

export default function fetchFileStream(
  item: Downloadable,
  options: FetchFileStreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isTeam);

  return downloadFile({
    bucketId: item.bucketId,
    fileId: item.fileId,
    creds: {
      pass: bridgePass,
      user: bridgeUser
    },
    mnemonic: encryptionKey,
    options: {
      notifyProgress: (totalBytes: number, downloadedBytes: number) => {
        options.updateProgressCallback(downloadedBytes / totalBytes);
      },
      abortController: options.abortController
    }
  });
}
