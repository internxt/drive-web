import fileDownload from 'js-file-download';

import localStorageService from './local-storage.service';
import analyticsService from './analytics.service';
import { DevicePlatform } from '../models/enums';
import { getEnvironmentConfig, Network } from '../lib/network';
import { DriveItemData } from '../models/interfaces';

export async function downloadFile(
  itemData: DriveItemData,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
): Promise<void> {
  const userEmail: string = localStorageService.getUser()?.email || '';
  const fileId = itemData.fileId;
  const completeFilename = itemData.type ? `${itemData.name}.${itemData.type}` : `${itemData.name}`;

  try {
    trackFileDownloadStart(userEmail, fileId, itemData.name, itemData.size, itemData.type, itemData.folderId);

    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);
    const network = new Network(bridgeUser, bridgePass, encryptionKey);

    const fileBlob = await network.downloadFile(bucketId, fileId, {
      progressCallback: updateProgressCallback,
    });

    fileDownload(fileBlob, completeFilename);

    trackFileDownloadFinished(userEmail, fileId, itemData.size);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : (err as string);

    trackFileDownloadError(userEmail, fileId, errMessage);

    throw new Error(errMessage);
  }
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
