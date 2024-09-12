import streamSaver from 'streamsaver';

import { TrackingPlan } from 'app/analytics/TrackingPlan';
import analyticsService from 'app/analytics/services/analytics.service';
import { loadWritableStreamPonyfill } from 'app/network/download';
import { ConnectionLostError } from '../../../network/requests';
import { DriveFileData } from '../../types';
import downloadFileFromBlob from './downloadFileFromBlob';
import fetchFileStream from './fetchFileStream';
import fetchFileStreamWithCreds from './fetchFileStreamWithCreds';

interface BlobWritable {
  getWriter: () => {
    abort: () => Promise<void>;
    close: () => Promise<void>;
    closed: Promise<undefined>;
    desiredSize: number | null;
    ready: Promise<undefined>;
    releaseLock: () => void;
    write: (chunk: Uint8Array) => Promise<void>;
  };
  locked: boolean;
  abort: () => Promise<void>;
  close: () => Promise<void>;
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
        releaseLock: () => {
          // no op
        },
        write: async (chunk) => {
          blobParts.push(chunk);
        },
      };
    },
    locked: false,
    abort: async () => {
      blobParts = [];
    },
    close: async () => {
      onClose(new File(blobParts, filename));
    },
  };
}

async function pipe(readable: ReadableStream, writable: BlobWritable): Promise<void> {
  const reader = readable.getReader();
  const writer = writable.getWriter();

  try {
    let done = false;

    while (!done) {
      const status = await reader.read();

      if (!status.done) {
        if (writer.desiredSize !== null && writer.desiredSize <= 0) {
          await writer.ready;
        }
        await writer.write(status.value);
      }

      done = status.done;
    }

    await reader.closed;
    await writer.close();
  } catch (error) {
    await reader.cancel();
    await writer.abort();
  } finally {
    reader.releaseLock();
    writer.releaseLock();
  }
}

export default async function downloadFile(
  itemData: DriveFileData,
  isWorkspace: boolean,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController,
  sharingOptions?: { credentials: { user: string; pass: string }; mnemonic: string },
): Promise<void> {
  const fileId = itemData.fileId;
  const completeFilename = itemData.type ? `${itemData.name}.${itemData.type}` : `${itemData.name}`;
  const isCypress = window['Cypress'] !== undefined;

  const writeToFsIsSupported = 'showSaveFilePicker' in window;
  const writableIsSupported = 'WritableStream' in window && streamSaver.WritableStream;

  let support: DownloadSupport;

  if (isCypress) {
    support = DownloadSupport.PatchedStreamApi;
  } else if (writeToFsIsSupported) {
    support = DownloadSupport.StreamApi;
  } else if (writableIsSupported) {
    support = DownloadSupport.PartialStreamApi;
  } else {
    support = DownloadSupport.PatchedStreamApi;
  }

  const trackingDownloadProperties: TrackingPlan.DownloadProperties = {
    process_identifier: analyticsService.getTrackingActionId(),
    file_id: typeof fileId === 'string' ? parseInt(fileId) : fileId,
    file_size: itemData.size,
    file_extension: itemData.type,
    file_name: completeFilename,
    parent_folder_id: itemData.folderId,
    file_download_method_supported: support,
    bandwidth: 0,
    band_utilization: 0,
    is_multiple: 0,
  };
  analyticsService.trackFileDownloadStarted(trackingDownloadProperties);

  const fileStreamPromise = !sharingOptions
    ? fetchFileStream(
        { ...itemData, bucketId: itemData.bucket },
        { isWorkspace, updateProgressCallback, abortController },
      )
    : fetchFileStreamWithCreds(
        { ...itemData, bucketId: itemData.bucket },
        {
          updateProgressCallback,
          abortController,
          creds: {
            user: sharingOptions.credentials.user,
            pass: sharingOptions.credentials.pass,
          },
          mnemonic: sharingOptions.mnemonic,
        },
      );

  let connectionLost = false;
  try {
    const connectionLostListener = () => {
      connectionLost = true;
      window.removeEventListener('offline', connectionLostListener);
    };
    window.addEventListener('offline', connectionLostListener);

    await downloadToFs(completeFilename, fileStreamPromise, support, abortController);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : (err as string);

    if (abortController?.signal.aborted && !connectionLost) {
      analyticsService.trackFileDownloadAborted(trackingDownloadProperties);
    } else {
      const error_message_user = connectionLost ? 'Internet connection lost' : 'Error downloading file';
      analyticsService.trackFileDownloadError({
        ...trackingDownloadProperties,
        error_message: errMessage,
        error_message_user: error_message_user,
        stack_trace: err instanceof Error ? err?.stack ?? '' : '',
        bandwidth: 0,
        band_utilization: 0,
        process_identifier: '',
        is_multiple: 0,
      });
    }

    if (connectionLost) throw new ConnectionLostError();
    else throw err;
  }

  analyticsService.trackFileDownloadCompleted(trackingDownloadProperties);
}

async function downloadFileAsBlob(filename: string, source: ReadableStream): Promise<void> {
  const destination: BlobWritable = getBlobWritable(filename, (blob) => {
    downloadFileFromBlob(blob, filename);
  });

  await pipe(source, destination);
}

function downloadFileUsingStreamApi(
  source: ReadableStream,
  destination: WritableStream,
  abortController?: AbortController,
): Promise<void> {
  return (
    (source.pipeTo && source.pipeTo(destination, { signal: abortController?.signal })) || pipe(source, destination)
  );
}

enum DownloadSupport {
  StreamApi = 'StreamApi',
  PartialStreamApi = 'PartialStreamApi',
  PatchedStreamApi = 'PartialStreamApi',
  Blob = 'Blob',
}

async function downloadToFs(
  filename: string,
  source: Promise<ReadableStream>,
  supports: DownloadSupport,
  abortController?: AbortController,
): Promise<void> {
  switch (supports) {
    case DownloadSupport.StreamApi:
      // eslint-disable-next-line no-case-declarations
      const fsHandle = await window.showSaveFilePicker({ suggestedName: filename });
      // eslint-disable-next-line no-case-declarations
      const destination = await fsHandle.createWritable({ keepExistingData: false });

      return downloadFileUsingStreamApi(await source, destination, abortController);
    case DownloadSupport.PatchedStreamApi:
      await loadWritableStreamPonyfill();

      streamSaver.WritableStream = window.WritableStream;

      return downloadFileUsingStreamApi(await source, streamSaver.createWriteStream(filename), abortController);
    case DownloadSupport.PartialStreamApi:
      return downloadFileUsingStreamApi(await source, streamSaver.createWriteStream(filename), abortController);

    default:
      return downloadFileAsBlob(filename, await source);
  }
}
