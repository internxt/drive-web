import { saveAs } from 'file-saver';

export default async function downloadFileFromBlob(fileBlob: Blob | string, filename: string): Promise<void> {
  saveAs(fileBlob, filename);
}
