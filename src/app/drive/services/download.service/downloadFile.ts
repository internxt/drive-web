import * as streamSaver from 'streamsaver';
import { ActionState } from '@internxt/inxt-js/build/api/ActionState';

import analyticsService from 'app/analytics/services/analytics.service';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform } from 'app/core/types';
import { DriveFileData } from '../../types';
import downloadFileFromBlob from './downloadFileFromBlob';
import fetchFileBlob from './fetchFileBlob';
import fetchFileStream from './fetchFileStream';

interface Writer<T> {
  write: (chunk: T) => Promise<void>
  close: () => Promise<void>
}

type Uint8ArrayWriter = Writer<Uint8Array>;

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

function getBlobWriter(filename: string, onClose: (result: Blob) => void): Writer<Uint8Array> {
  const blobParts: Uint8Array[] = [];

  return {
    write: async (chunk) => {
      blobParts.push(chunk);
    },
    close: async () => {
      onClose(new File(blobParts, filename));
    }
  };
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

  const [fileStreamPromise, actionState] = fetchFileStream(itemData, { isTeam, updateProgressCallback });

  const handleError = (err: any) => {
    const errMessage = err instanceof Error ? err.message : (err as string);

    trackFileDownloadError(userEmail, fileId, errMessage);

    throw new Error(errMessage);
  };

  const writeToFsIsSupported = 'showSaveFilePicker' in window;
  const writableIsSupported = 'WritableStream' in window && streamSaver.WritableStream;

  let writerPromise: Promise<Uint8ArrayWriter>;

  if (writeToFsIsSupported) {
    writerPromise = window.showSaveFilePicker({
      suggestedName: completeFilename
    }).then((fsHandle) => {
      return fsHandle.createWritable({ keepExistingData: false });
    }).then((w) => {
      return w.getWriter();
    });
  } else if (writableIsSupported) {
    writerPromise = new Promise<Uint8ArrayWriter>((resolve) => {
      resolve(
        streamSaver.createWriteStream(completeFilename, { size: itemData.size }).getWriter()
      );
    });
  } else {
    writerPromise = new Promise((resolve) => {
      resolve(getBlobWriter(completeFilename, (blob) => {
        downloadFileFromBlob(blob, completeFilename);
      }));
    });
  }

  const downloadPromise = fileStreamPromise.then((readable) => {
    return writerPromise.then(async (writer) => {
      const reader = readable.getReader();

      let downloadedBytes = 0;
      let done = false;

      while (!done) {
        const status = await reader.read();

        if (!status.done) {
          await writer.write(status.value);

          downloadedBytes += status.value.length;

          updateProgressCallback(downloadedBytes / itemData.size);
        }

        done = status.done;
      }

      await writer.close();
    }).catch(handleError);
  });

  return [downloadPromise.then(() => {
    analyticsService.trackFileDownloadCompleted({
      size: itemData.size,
      extension: itemData.type,
    });
  }), actionState];
}
