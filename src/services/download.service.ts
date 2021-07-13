import fileDownload from "js-file-download";

import localStorageService from './localStorage.service';
import analyticsService from './analytics.service';
import { DevicePlatform } from "../models/enums";
import { getEnvironmentConfig, Network } from "../lib/network";

export async function downloadFile (id: string, _class, pcb, userEmail: string) {
  const isTeam: boolean = !!localStorageService.getUser().teams;
  const fileId = pcb.props.rawItem.fileId;
  const fileName = pcb.props.rawItem.name;
  const fileSize = pcb.props.rawItem.size;
  const folderId = pcb.props.rawItem.folder_id;
  const fileType = pcb.props.type;

  const completeFilename = fileType ? `${fileName}.${fileType}` : `${fileName}`;

  try {
    trackFileDownloadStart(userEmail, fileId, fileName, fileSize, fileType, folderId);

    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(isTeam);
    const network = new Network(bridgeUser, bridgePass, encryptionKey);

    const fileBlob = await network.downloadFile(bucketId, fileId, {
      progressCallback: (progress) => pcb.setState({ progress })
    });

    fileDownload(fileBlob, completeFilename);

    trackFileDownloadFinished(userEmail, id, fileSize);
  } catch (err) {
    trackFileDownloadError(userEmail, fileId, err.message);

    throw err;
    /* toast.warn(`Error downloading file: \n Reason is ${err.message} \n File id: ${fileId}`); */
  } finally {
    pcb.setState({ progress: 0 });
  }
}

const trackFileDownloadStart = (userEmail: string, file_id: string, file_name: string, file_size: number, file_type: string, folder_id: string) => {
  const data = { file_id, file_name, file_size, file_type, email: userEmail, folder_id, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadStart(data);
}

const trackFileDownloadError = (userEmail: string, file_id: string, msg: string) => {
  const data = { file_id, email: userEmail, msg, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadError(data);
}

const trackFileDownloadFinished = (userEmail: string, file_id: string, file_size: number) => {
  const data = { file_id, file_size, email: userEmail, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadFinished(data);
}

const downloadService = {
  downloadFile
}

export default downloadService;