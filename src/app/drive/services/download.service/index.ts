import fetchFileBlob from './fetchFileBlob';
import downloadFileFromBlob from './downloadFileFromBlob';
import downloadFile from './downloadFile';
import downloadBackup from './downloadBackup';
import downloadFolder from './downloadFolder';

const downloadService = {
  fetchFileBlob,
  downloadFileFromBlob,
  downloadFile,
  downloadFolder,
  downloadBackup,
};

export default downloadService;
