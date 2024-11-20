import streamSaver from 'streamsaver';

import { loadWritableStreamPonyfill } from 'app/network/download';
import { isFirefox } from 'react-device-detect';
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

export default async function downloadFile(
  itemData: DriveFileData,
  isWorkspace: boolean,
  updateProgressCallback: (progress: number) => void,
  abortController?: AbortController,
  sharingOptions?: { credentials: { user: string; pass: string }; mnemonic: string },
): Promise<void> {
  const completeFilename = itemData.type ? `${itemData.name}.${itemData.type}` : `${itemData.name}`;
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));
  const isCypress = window['Cypress'] !== undefined;

  const writeToFsIsSupported = 'showSaveFilePicker' in window;
  const writableIsSupported = 'WritableStream' in window && streamSaver.WritableStream;

  let support: DownloadSupport;

  if (isCypress) {
    support = DownloadSupport.PatchedStreamApi;
  } else if (isBrave) {
    support = DownloadSupport.Blob;
  } else if (writeToFsIsSupported) {
    support = DownloadSupport.StreamApi;
  } else if (writableIsSupported) {
    support = DownloadSupport.PartialStreamApi;
  } else {
    support = DownloadSupport.PatchedStreamApi;
  }

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

    await downloadToFs(completeFilename, fileStreamPromise, support, isFirefox, abortController);
  } catch (err) {
    if (connectionLost) throw new ConnectionLostError();
    else throw err;
  }
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
  isFirefoxBrowser?: boolean,
  abortController?: AbortController,
): Promise<void> {
  if (isFirefoxBrowser) {
    return downloadFileAsBlob(filename, await source);
  }

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
