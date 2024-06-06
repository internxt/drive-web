import { SharedFiles } from '@internxt/sdk/dist/drive/share/types';
import { Iterator } from 'app/core/collections';
import { FlatFolderZip } from '../../core/services/zip.service';
import { DriveFileData } from '../types';

type File = SharedFiles | DriveFileData;

async function addFilesToZip<T extends File>(
  currentAbsolutePath: string,
  downloadFile: (file: T) => Promise<ReadableStream>,
  iterator: Iterator<T>,
  zip: FlatFolderZip,
): Promise<{ files: T[]; token?: string }> {
  const path = currentAbsolutePath;
  const allFiles: T[] = [];

  const addFileToZip = async (file: T) => {
    const fileStream = await downloadFile(file);
    zip.addFile(path + '/' + file.name + (file.type ? '.' + file.type : ''), fileStream);
  };

  let pack;
  let moreFiles = true;
  while (moreFiles) {
    pack = await iterator.next();

    const files = pack.value;
    moreFiles = !pack.done;
    allFiles.push(...files);

    for (const file of files) {
      await addFileToZip(file);
    }
  }
  return { files: allFiles, token: pack?.token ?? '' };
}

async function addAllFilesToZip(
  currentAbsolutePath: string,
  downloadFile: (file: DriveFileData) => Promise<ReadableStream>,
  iterator: Iterator<DriveFileData>,
  zip: FlatFolderZip,
): Promise<DriveFileData[]> {
  const { files } = await addFilesToZip<DriveFileData>(currentAbsolutePath, downloadFile, iterator, zip);
  return files;
}

async function addAllSharedFilesToZip(
  currentAbsolutePath: string,
  downloadFile: (file: SharedFiles) => Promise<ReadableStream>,
  iterator: Iterator<SharedFiles>,
  zip: FlatFolderZip,
): Promise<{ files: SharedFiles[]; token: string }> {
  const { files, token } = await addFilesToZip<SharedFiles>(currentAbsolutePath, downloadFile, iterator, zip);
  return { files, token: token ?? '' };
}

export { addAllFilesToZip, addAllSharedFilesToZip };
