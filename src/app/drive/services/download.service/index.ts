import downloadBackup from './downloadBackup';
import downloadFile from './downloadFile';
import downloadFileFromBlob from './downloadFileFromBlob';
import fetchFileBlob from './fetchFileBlob';

const downloadService = {
  fetchFileBlob,
  downloadFileFromBlob,
  downloadFile,
  downloadBackup,
};

export default downloadService;
