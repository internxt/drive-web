import downloadBackup from './downloadBackup';
import downloadFile from './downloadFile';
import downloadFileFromBlob from './downloadFileFromBlob';
import fetchFileBlob from './fetchFileBlob';
import downloadFolder from './downloadFolder';

const downloadService = {
  fetchFileBlob,
  downloadFileFromBlob,
  downloadFile,
  downloadBackup,
  downloadFolder,
};

export default downloadService;
