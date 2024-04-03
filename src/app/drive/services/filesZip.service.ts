import { SharedFiles } from '@internxt/sdk/dist/drive/share/types';
import { Iterator } from 'app/core/collections';
import { FlatFolderZip } from '../../core/services/zip.service';
import { DriveFileData } from '../types';

async function addAllFilesToZip(
  currentAbsolutePath: string,
  downloadFile: (file: DriveFileData) => Promise<ReadableStream>,
  iterator: Iterator<DriveFileData>,
  zip: FlatFolderZip,
): Promise<DriveFileData[]> {
  const path = currentAbsolutePath;
  const allFiles: DriveFileData[] = [];

  const addFileToZip = async (file: DriveFileData) => {
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

  return allFiles;
}

async function addAllSharedFilesToZip(
  currentAbsolutePath: string,
  downloadFile: (file: SharedFiles) => Promise<ReadableStream>,
  iterator: Iterator<SharedFiles>,
  zip: FlatFolderZip,
): Promise<{ files: SharedFiles[]; token: string }> {
  const path = currentAbsolutePath;
  const allFiles: SharedFiles[] = [];
  const addFileToZip = async (file: SharedFiles) => {
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

  return { files: allFiles, token: pack.token ?? '' };
}

export { addAllFilesToZip, addAllSharedFilesToZip };
