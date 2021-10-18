import fetchFileBlob from './fetchFileBlob';
import downloadFile from './downloadFile';
import downloadBackup from './downloadBackup';
import downloadFolder from './downloadFolder';

const downloadService = {
  fetchFileBlob,
  downloadFile,
  downloadFolder,
  downloadBackup,
};

export default downloadService;
