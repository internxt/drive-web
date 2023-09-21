import { binaryStreamToBlob } from '../../../core/services/stream.service';
import { getEnvironmentConfig } from '../network.service';
import { Downloadable, downloadFile, NetworkCredentials } from '../../../network/download';

type FetchFileBlobOptions = {
  updateProgressCallback: (progress: number) => void;
  isTeam?: boolean;
  abortController?: AbortController;
};

export default async function fetchFileBlob(
  item: Downloadable,
  options: FetchFileBlobOptions,
  credentials?: NetworkCredentials,
  mnemonic?: string,
): Promise<Blob> {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isTeam);

  const creds = credentials ? credentials : { pass: bridgePass, user: bridgeUser };

  const fileStream = await downloadFile({
    bucketId: item.bucketId,
    fileId: item.fileId,
    creds,
    mnemonic: mnemonic ? mnemonic : encryptionKey,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        options.updateProgressCallback(downloadedBytes / totalBytes);
      },
      abortController: options.abortController,
    },
  });

  return binaryStreamToBlob(fileStream);
}
