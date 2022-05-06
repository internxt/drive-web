import { getEnvironmentConfig } from '../network.service';
import { DeviceBackup } from '../../../backups/types';
import { Abortable } from 'app/network/Abortable';
import { downloadFile } from 'app/network/download';

export default async function downloadBackup(
  backup: DeviceBackup,
  {
    progressCallback,
    finishedCallback,
    errorCallback,
  }: {
    progressCallback: (progress: number) => void;
    finishedCallback: () => void;
    errorCallback: (err: Error) => void;
  },
): Promise<Abortable | undefined> {
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

  const [downloadStreamPromise, abortable] = downloadFile({
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
      }
    }
  });

  const downloadStream = await downloadStreamPromise;

  downloadStream.pipeTo(writable).then(() => {
    finishedCallback();
  }).catch((err) => {
    errorCallback(err);
  });

  return abortable;
}
