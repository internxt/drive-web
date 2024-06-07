import { binaryStreamToBlob } from '../../../core/services/stream.service';
import { Downloadable, downloadFile, NetworkCredentials } from '../../../network/download';
import { getEnvironmentConfig } from '../network.service';

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

  const creds = credentials ?? { pass: bridgePass, user: bridgeUser };

  let lastReportedProgress = -1;

  const fileStream = await downloadFile({
    bucketId: item.bucketId,
    fileId: item.fileId,
    creds,
    mnemonic: mnemonic ? mnemonic : encryptionKey,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        const progress = downloadedBytes / totalBytes;
        const progressInt = Math.floor(progress * 100); // Convert to percentage and round down

        if (progressInt > lastReportedProgress) {
          lastReportedProgress = progressInt;
          console.log('lastReportedProgress', lastReportedProgress);
          options.updateProgressCallback(progressInt / 100); // Call with the progress as a fraction
        }
      },
      abortController: options.abortController,
    },
  });

  return binaryStreamToBlob(fileStream);
}
