import { saveAs } from 'file-saver';

async function downloadFileFromBlob(fileBlob: Blob | string, filename: string): Promise<void> {
  saveAs(fileBlob, filename);
}

export default downloadFileFromBlob;
