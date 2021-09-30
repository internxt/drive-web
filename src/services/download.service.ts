import fileDownload from 'js-file-download';

import localStorageService from './local-storage.service';
import analyticsService from './analytics.service';
import { DevicePlatform } from '../models/enums';
import { getEnvironmentConfig, Network } from '../lib/network';
import { DeviceBackup, DriveItemData } from '../models/interfaces';
import { ActionState } from '@internxt/inxt-js/build/api/ActionState';

export function downloadFile(
  itemData: DriveItemData,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
): [Promise<void>, ActionState | undefined] {
  const userEmail: string = localStorageService.getUser()?.email || '';
  const fileId = itemData.fileId;
  const completeFilename = itemData.type ? `${itemData.name}.${itemData.type}` : `${itemData.name}`;

  trackFileDownloadStart(userEmail, fileId, itemData.name, itemData.size, itemData.type, itemData.folderId);

  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);
  const network = new Network(bridgeUser, bridgePass, encryptionKey);

  const [blobPromise, actionState] = network.downloadFile(bucketId, fileId, {
    progressCallback: updateProgressCallback,
  });

  const fileBlobPromise = blobPromise
    .then((fileBlob) => {
      fileDownload(fileBlob, completeFilename);
      trackFileDownloadFinished(userEmail, fileId, itemData.size);
    })
    .catch((err) => {
      const errMessage = err instanceof Error ? err.message : (err as string);

      trackFileDownloadError(userEmail, fileId, errMessage);

      throw new Error(errMessage);
    });

  return [fileBlobPromise.then(), actionState];
}

export async function downloadBackup(
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
    suggestedName: backup.name,
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

const trackFileDownloadStart = (
  userEmail: string,
  file_id: string,
  file_name: string,
  file_size: number,
  file_type: string,
  folder_id: number,
) => {
  const data = { file_id, file_name, file_size, file_type, email: userEmail, folder_id, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadStart(data);
};

const trackFileDownloadError = (userEmail: string, file_id: string, msg: string) => {
  const data = { file_id, email: userEmail, msg, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadError(data);
};

const trackFileDownloadFinished = (userEmail: string, file_id: string, file_size: number) => {
  const data = { file_id, file_size, email: userEmail, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadFinished(data);
};

const downloadService = {
  downloadFile,
};

export default downloadService;
