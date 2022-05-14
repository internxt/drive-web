import { getEnvironmentConfig } from '../network.service';
import { DeviceBackup } from '../../../backups/types';
import { downloadFile } from 'app/network/download';

export default async function downloadBackup(
  backup: DeviceBackup,
  {
    progressCallback,
    finishedCallback,
    errorCallback,
    abortController
  }: {
    progressCallback: (progress: number) => void;
    finishedCallback: () => void;
    errorCallback: (err: Error) => void;
    abortController?: AbortController
  },
): Promise<void> {
  if (!('showSaveFilePicker' in window)) {
    const err = new Error('File System Access API not available');
    err.name = 'FILE_SYSTEM_API_NOT_AVAILABLE';
    throw err;
  }

  if (!backup.fileId) {
    throw new Error('This backup has not been uploaded yet');
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: `${backup.name}.zip`,
    types: [{ accept: { 'application/zip': ['.zip'] } }],
  });

  const writable = await handle.createWritable();
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig();

  const downloadStream = await downloadFile({
    bucketId: backup.bucket,
    fileId: backup.fileId,
    creds: {
      pass: bridgePass,
      user: bridgeUser
    },
    mnemonic: encryptionKey,
    options: {
      notifyProgress: (totalBytes, downloadedBytes) => {
        progressCallback(downloadedBytes / totalBytes);
      },
      abortController
    }
  });

  downloadStream.pipeTo(writable).then(() => {
    finishedCallback();
  }).catch((err) => {
    errorCallback(err);
  });
}
