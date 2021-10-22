import { ActionState } from '@internxt/inxt-js/build/api/ActionState';

import analyticsService from 'app/analytics/services/analytics.service';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform } from 'app/core/types';
import { DriveFileData } from '../../types';
import downloadFileFromBlob from './downloadFileFromBlob';
import fetchFileBlob from './fetchFileBlob';

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

export default function downloadFile(
  itemData: DriveFileData,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
): [Promise<void>, ActionState | undefined] {
  const userEmail: string = localStorageService.getUser()?.email || '';
  const fileId = itemData.fileId;
  const completeFilename = itemData.type ? `${itemData.name}.${itemData.type}` : `${itemData.name}`;

  trackFileDownloadStart(userEmail, fileId, itemData.name, itemData.size, itemData.type, itemData.folderId);

  const [blobPromise, actionState] = fetchFileBlob(fileId, { isTeam, updateProgressCallback });
  const fileBlobPromise = blobPromise
    .then((fileBlob) => {
      downloadFileFromBlob(fileBlob, completeFilename);
      trackFileDownloadFinished(userEmail, fileId, itemData.size);
    })
    .catch((err) => {
      const errMessage = err instanceof Error ? err.message : (err as string);

      trackFileDownloadError(userEmail, fileId, errMessage);

      throw new Error(errMessage);
    });

  return [fileBlobPromise.then(), actionState];
}
