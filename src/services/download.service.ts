import fileDownload from 'js-file-download';

import localStorageService from './localStorage.service';
import analyticsService from './analytics.service';
import { DevicePlatform, FileActionTypes, FileStatusTypes } from '../models/enums';
import { getEnvironmentConfig, Network } from '../lib/network';
import fileLogger from './fileLogger';
import { toast } from 'react-toastify';

export async function downloadFile(itemData: any): Promise<void> {
  const isTeam: boolean = !!localStorageService.getUser()?.teams;
  const userEmail: string = localStorageService.getUser()?.email || '';
  const fileId = itemData.fileId || itemData.id;
  const completeFilename = itemData.type ?
    `${itemData.name}.${itemData.type}` :
    `${itemData.name}`;

  fileLogger.push({ action: FileActionTypes.Download, status: FileStatusTypes.Decrypting, filePath: itemData.name });

  try {
    trackFileDownloadStart(userEmail, fileId, itemData.name, itemData.size, itemData.type, itemData.folderId);

    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);
    const network = new Network(bridgeUser, bridgePass, encryptionKey);

    const fileBlob = await network.downloadFile(bucketId, fileId, {
      progressCallback: (progress) => { } /* pcb.setState({ progress }) */
    });

    fileDownload(fileBlob, completeFilename);

    fileLogger.push({ tion: FileActionTypes.Download, status: FileStatusTypes.Success, filePath: itemData.name });
    trackFileDownloadFinished(userEmail, fileId, itemData.size);
  } catch (err) {
    fileLogger.push({ action: FileActionTypes.Download, status: FileStatusTypes.Error, filePath: itemData.name, message: err.message });
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