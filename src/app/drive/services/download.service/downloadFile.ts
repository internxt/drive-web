import streamSaver from 'streamsaver';
import { ActionState } from '@internxt/inxt-js/build/api/ActionState';

import analyticsService from 'app/analytics/services/analytics.service';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform } from 'app/core/types';
import { DriveFileData } from '../../types';
import downloadFileFromBlob from './downloadFileFromBlob';
import fetchFileStream from './fetchFileStream';
import { loadWritableStreamPonyfill } from 'app/network/download';

const trackFileDownloadStart = (
  userEmail: string,
  file_id: string,
  file_name: string,
  file_size: number,
  file_type: string,
  folder_id: number,
) => {
  const data = { file_id, file_name, file_size, file_type, email: userEmail, folder_id, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadStart(data);
};

const trackFileDownloadError = (userEmail: string, file_id: string, msg: string) => {
  const data = { file_id, email: userEmail, msg, platform: DevicePlatform.Web };

  analyticsService.trackFileDownloadError(data);
};

interface BlobWritable {
  getWriter: () => {
    abort: () => Promise<void>
    close: () => Promise<void>
    closed: Promise<undefined>
    desiredSize: number | null
    ready: Promise<undefined>
    releaseLock: () => void
    write: (chunk: Uint8Array) => Promise<void>
  },
  locked: boolean,
  abort: () => Promise<void>
  close: () => Promise<void>
}

function getBlobWritable(filename: string, onClose: (result: Blob) => void): BlobWritable {
  let blobParts: Uint8Array[] = [];

  return {
    getWriter: () => {
      return {
        abort: async () => {
          blobParts = [];
        },
        close: async () => {
          onClose(new File(blobParts, filename));
        },
        closed: Promise.resolve(undefined),
        desiredSize: 3 * 1024 * 1024,
        ready: Promise.resolve(undefined),
        releaseLock: () => { null; },
        write: async (chunk) => {
          blobParts.push(chunk);
        }
      };
    },
    locked: false,
    abort: async () => {
      blobParts = [];
    },
    close: async () => {
      onClose(new File(blobParts, filename));
    }
  };
}

async function pipe(readable: ReadableStream, writable: BlobWritable): Promise<void> {
  const reader = readable.getReader();
  const writer = writable.getWriter();

  let done = false;

  while (!done) {
    const status = await reader.read();

    if (!status.done) {
      await writer.write(status.value);
    }

    done = status.done;
  }

  await reader.closed;
  await writer.close();
}

export default function downloadFile(
  itemData: DriveFileData,
  isTeam: boolean,
  updateProgressCallback: (progress: number) => void,
): [Promise<void>, ActionState | undefined] {
  const userEmail: string = localStorageService.getUser()?.email || '';
  const fileId = itemData.fileId;
  const completeFilename = itemData.type ? `${itemData.name}.${itemData.type}` : `${itemData.name}`;

  trackFileDownloadStart(userEmail, fileId, itemData.name, itemData.size, itemData.type, itemData.folderId);

  const [fileStreamPromise, actionState] = fetchFileStream({ ...itemData, bucketId: itemData.bucket }, { isTeam, updateProgressCallback });

  const handleError = (err: unknown) => {
    const errMessage = err instanceof Error ? err.message : (err as string);

    trackFileDownloadError(userEmail, fileId, errMessage);

    throw new Error(errMessage);
  };

  const writeToFsIsSupported = 'showSaveFilePicker' in window;
  const writableIsSupported = 'WritableStream' in window && streamSaver.WritableStream;

  let writerPromise: Promise<WritableStream>;

  if (writeToFsIsSupported) {
    writerPromise = window.showSaveFilePicker({
      suggestedName: completeFilename
    }).then((fsHandle) => {
      return fsHandle.createWritable({ keepExistingData: false });
    });
  } else if (writableIsSupported) {
    writerPromise = new Promise((resolve) => {
      resolve(streamSaver.createWriteStream(completeFilename));
    });
  } else {
    writerPromise = new Promise((resolve) => {
      return loadWritableStreamPonyfill().then(() => {
        // TODO: Force streamSaver to use WritableStream ponyfill
        streamSaver.WritableStream = window.WritableStream;
        resolve(streamSaver.createWriteStream(completeFilename));
      }).catch(() => {
        resolve(getBlobWritable(completeFilename, (blob) => {
          downloadFileFromBlob(blob, completeFilename);
        }));
      });
    });
  }

  const downloadPromise = fileStreamPromise.then((readable) => {
    return writerPromise.then((writable) => {

      return readable.pipeTo && readable.pipeTo(writable) || pipe(readable, writable);
    }).catch(handleError);
  });

  return [downloadPromise.then(() => {
    analyticsService.trackFileDownloadCompleted({
      size: itemData.size,
      extension: itemData.type,
    });
  }), actionState];
}
