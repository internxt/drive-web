import { binaryStreamToBlob } from 'services/stream.service';
import { Downloadable, downloadFile } from 'app/network/download';
import { getEnvironmentConfig } from '../network.service';
import { FileKey, NetworkCredentials } from 'app/network/types/helper-types';

type FetchFileBlobOptions = {
  updateProgressCallback: (progress: number) => void;
  incrementItemCount?: () => void;
  isWorkspace: boolean;
  abortController?: AbortController;
};

export default async function fetchFileBlob(
  item: Downloadable,
  options: FetchFileBlobOptions,
  credentials?: NetworkCredentials,
  key?: FileKey,
): Promise<Blob> {
  const { bridgeUser, bridgePass, encryptionKey } = await getEnvironmentConfig(!!options.isWorkspace);

  const creds = credentials ? credentials : { pass: bridgePass, user: bridgeUser };

  const fileStream = await downloadFile({
    bucketId: item.bucketId,
    fileId: item.fileId,
    creds,
    key: key ?? { mnemonic: encryptionKey },
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        options.updateProgressCallback(downloadedBytes / totalBytes);
        options.incrementItemCount && options.incrementItemCount();
      },
      abortController: options.abortController,
    },
  });

  return binaryStreamToBlob(fileStream);
}
