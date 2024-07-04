import downloadBackup from './downloadBackup';
import downloadFile from './downloadFile';
import downloadFileFromBlob from './downloadFileFromBlob';
import downloadFolder from './downloadFolder';
import fetchFileBlob from './fetchFileBlob';

const downloadService = {
  fetchFileBlob,
  downloadFileFromBlob,
  downloadFile,
  downloadFolder,
  downloadBackup,
};

export default downloadService;
