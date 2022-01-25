import { ActionState } from '@internxt/inxt-js/build/api/ActionState';

import { getEnvironmentConfig, Network } from '../network/network';
import { DeviceBackup } from '../../../backups/types';

export default async function downloadBackup(
  backup: DeviceBackup,
  {
    progressCallback,
    finishedCallback,
    errorCallback,
  }: {
    progressCallback: (progress: number) => void;
    finishedCallback: () => void;
    errorCallback: () => void;
  },
): Promise<ActionState | undefined> {
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

  let actionState: ActionState | undefined;

  if (handle) {
    const writable = await handle.createWritable();
    const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig();
    const network = new Network(bridgeUser, bridgePass, encryptionKey);
    const [downloadStreamPromise, _actionState] = network.getFileDownloadStream(backup.bucket, backup.fileId, {
      progressCallback,
    });
    actionState = _actionState;
    const downloadStream = await downloadStreamPromise;

    downloadStream.on('data', (chunk: Buffer) => {
      writable.write(chunk);
    });
    downloadStream.once('end', () => {
      writable.close();
      finishedCallback();
    });
    downloadStream.once('error', () => {
      writable.abort();
      errorCallback();
    });
  }

  return actionState;
}
