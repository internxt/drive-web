import { SharedFiles } from '@internxt/sdk/dist/drive/share/types';
import { Iterator } from 'app/core/collections';
import { binaryStreamToBlob } from '../../core/services/stream.service';
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
    zip.addFile(path + '/' + (file.plainName ?? file.name) + (file.type ? '.' + file.type : ''), fileStream);
  };

  let pack;
  let moreFiles = true;
  while (moreFiles) {
    pack = await iterator.next();

    const files = pack.value;
    moreFiles = !pack.done;
    allFiles.push(...files);

    const filesSortedBySizeAsc = files.sort((fA, fB) => parseInt(fA.size) - parseInt(fB.size));
    const maxCacheSizeUsed = 50 * 1024 * 1024;

    for (const filesChunk of getFilesChunksUntilMaxCacheSize<T>(maxCacheSizeUsed, filesSortedBySizeAsc)) {
      const fileTooBigToBufferize = filesChunk.length === 1;

      if (fileTooBigToBufferize) {
        const [file] = filesChunk;
        await addFileToZip(file);
      } else {
        const downloadPromises: Promise<{
          name: string;
          type: string;
          blob: Blob;
        }>[] = [];

        for (const file of filesChunk) {
          const downloadPromise = downloadFile(file).then(async (fileStream) => {
            const fileBlob = await binaryStreamToBlob(fileStream, file.type || '');
            return { name: file.plainName ?? file.name, type: file.type, blob: fileBlob };
          });

          downloadPromises.push(downloadPromise);
        }

        const downloadedFiles = await Promise.all(downloadPromises);

        for (const downloadedFile of downloadedFiles) {
          if (downloadedFile) {
            const { name, type, blob } = downloadedFile;
            zip.addFile(path + '/' + (name + (type ? '.' + type : '')), (blob as Blob).stream());
          }
        }
      }
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

function* getFilesChunksUntilMaxCacheSize<T extends File>(maxCacheSizeUsed: number, files: T[]): Generator<T[]> {
  let accumulatedSize = 0;
  let chunk: T[] = [];

  for (const file of files) {
    const fileSize = parseInt(file.size as string);

    if (accumulatedSize + fileSize <= maxCacheSizeUsed && chunk.length < 6) {
      chunk.push(file);
      accumulatedSize += fileSize;
    } else {
      yield chunk;
      chunk = [file];
      accumulatedSize = fileSize;
    }
  }

  if (chunk.length > 0) {
    yield chunk;
  }
}

export { addAllFilesToZip, addAllSharedFilesToZip };
