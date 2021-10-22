import fetchFileBlob from './fetchFileBlob';
import fileDownload from './fileDownload';
import downloadFile from './downloadFile';
import downloadBackup from './downloadBackup';
import downloadFolder from './downloadFolder';

const downloadService = {
  fetchFileBlob,
  fileDownload,
  downloadFile,
  downloadFolder,
  downloadBackup,
};

export default downloadService;
