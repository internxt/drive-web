import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { getEnvironmentConfig } from '../network.service';
import { Downloadable, downloadFile } from 'app/network/download';

type FetchFileBlobOptions = { updateProgressCallback: (progress: number) => void; isTeam?: boolean };

export default function fetchFileBlob(
  item: Downloadable,
  options: FetchFileBlobOptions,
): [Promise<Blob>, { stop: () => void } | undefined] {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isTeam);

  const [streamPromise, abortable] = downloadFile({
    bucketId: item.bucketId,
    fileId: item.fileId,
    creds: {
      pass: bridgePass,
      user: bridgeUser
    },
    mnemonic: encryptionKey,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        options.updateProgressCallback(downloadedBytes / totalBytes);
      }
    }
  });

  return [streamPromise.then(binaryStreamToBlob), { stop: () => abortable.abort() }];
}
