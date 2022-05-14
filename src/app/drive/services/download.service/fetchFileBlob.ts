import { binaryStreamToBlob } from 'app/core/services/stream.service';
import { getEnvironmentConfig } from '../network.service';
import { Downloadable, downloadFile } from 'app/network/download';

type FetchFileBlobOptions = { updateProgressCallback: (progress: number) => void; isTeam?: boolean, abortController?: AbortController };

export default async function fetchFileBlob(
  item: Downloadable,
  options: FetchFileBlobOptions,
): Promise<Blob> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isTeam);

  const fileStream = await downloadFile({
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
      },
      abortController: options.abortController
    }
  });

  return binaryStreamToBlob(fileStream);
}
