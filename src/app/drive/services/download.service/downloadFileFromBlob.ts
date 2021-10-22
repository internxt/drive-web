import { saveAs } from 'file-saver';

async function downloadFileFromBlob(fileBlob: Blob, filename: string) {
  saveAs(fileBlob, filename);
}

export default downloadFileFromBlob;
