import fileDownload from 'js-file-download';
import { toast } from 'react-toastify';

import localStorageService from './localStorage.service';
import analyticsService from './analytics.service';
import { DevicePlatform, FileActionTypes, FileStatusTypes } from '../models/enums';
import { getEnvironmentConfig, Network } from '../lib/network';
import { updateFileStatusLogger } from '../store/slices/files';
import { AppDispatch } from '../store';
import { DriveItemData } from '../models/interfaces';

export async function downloadFile(itemData: DriveItemData, totalPath: string, dispatch: AppDispatch, isTeam: boolean): Promise<void> {
  const userEmail: string = localStorageService.getUser()?.email || '';
  const fileId = itemData.fileId || itemData.id;
  const completeFilename = itemData.type ?
    `${itemData.name}.${itemData.type}` :
    `${itemData.name}`;

  const isFolder = itemData.fileId ? false : true;

  dispatch(updateFileStatusLogger({ action: FileActionTypes.Download, status: FileStatusTypes.Decrypting, filePath: totalPath, type: itemData.type, isFolder }));

  try {
    trackFileDownloadStart(userEmail, fileId, itemData.name, itemData.size, itemData.type, itemData.folderId);

    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);
    const network = new Network(bridgeUser, bridgePass, encryptionKey);

    const fileBlob = await network.downloadFile(bucketId, fileId, {
      progressCallback: (progress) => {
        dispatch(updateFileStatusLogger({ action: FileActionTypes.Download, status: FileStatusTypes.Downloading, filePath: totalPath, progress: progress.toFixed(2), type: itemData.type, isFolder: isFolder }));
      }
    });

    fileDownload(fileBlob, completeFilename);
    dispatch(updateFileStatusLogger({ action: FileActionTypes.Download, status: FileStatusTypes.Success, filePath: totalPath, type: itemData.type, isFolder: isFolder }));

    trackFileDownloadFinished(userEmail, fileId, itemData.size);
  } catch (err) {
    dispatch(updateFileStatusLogger({ action: FileActionTypes.Download, status: FileStatusTypes.Error, filePath: totalPath, type: itemData.type, isFolder: isFolder }));

    trackFileDownloadError(userEmail, fileId, err.message);
    toast.warn(`Error downloading file: \n Reason is ${err.message} \n File id: ${fileId}`);

    throw err;
  }
}

const trackFileDownloadStart = (userEmail: string, file_id: number, file_name: string, file_size: number, file_type: string, folder_id: string) => {
  const data = { file_id, file_name, file_size, file_type, email: userEmail, folder_id, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadStart(data);
};

const trackFileDownloadError = (userEmail: string, file_id: number, msg: string) => {
  const data = { file_id, email: userEmail, msg, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadError(data);
};

const trackFileDownloadFinished = (userEmail: string, file_id: number, file_size: number) => {
  const data = { file_id, file_size, email: userEmail, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadFinished(data);
};

const downloadService = {
  downloadFile
};

export default downloadService;