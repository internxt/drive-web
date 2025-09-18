import downloadFile from './downloadFile';
import downloadFileFromBlob from './downloadFileFromBlob';
import fetchFileBlob from './fetchFileBlob';

const downloadService = {
  fetchFileBlob,
  downloadFileFromBlob,
  downloadFile,
};

export default downloadService;
