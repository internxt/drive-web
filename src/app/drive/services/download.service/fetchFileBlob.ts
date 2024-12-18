import { binaryStreamToBlob } from '../../../core/services/stream.service';
import { Downloadable, downloadFile, NetworkCredentials } from '../../../network/download';
import { getEnvironmentConfig } from '../network.service';

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
  mnemonic?: string,
): Promise<Blob> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isWorkspace);

  const creds = credentials ? credentials : { pass: bridgePass, user: bridgeUser };

  const fileStream = await downloadFile({
    bucketId: item.bucketId,
    fileId: item.fileId,
    creds,
    mnemonic: mnemonic ? mnemonic : encryptionKey,
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
