import streamSaver from 'streamsaver';
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
  const fileName = itemData.plainName ?? itemData.name;
  const completeFilename = itemData.type ? `${fileName}.${itemData.type}` : `${fileName}`;
  const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));
  const isCypress = window['Cypress'] !== undefined;

  const writeToFsIsSupported = 'showSaveFilePicker' in window;

  let support: DownloadSupport;

  if (isCypress) {
    support = DownloadSupport.PartialStreamApi;
  } else if (isBrave) {
    support = DownloadSupport.Blob;
  } else if (writeToFsIsSupported) {
    support = DownloadSupport.StreamApi;
  } else {
    support = DownloadSupport.PartialStreamApi;
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

    await downloadToFs(completeFilename, fileStreamPromise, support, abortController);
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
  return source.pipeTo
    ? source.pipeTo(destination, { signal: abortController?.signal })
    : pipe(source, destination as BlobWritable);
}

enum DownloadSupport {
  StreamApi = 'StreamApi',
  PartialStreamApi = 'PartialStreamApi',
  Blob = 'Blob',
}

async function downloadFileWithBlockBufferStreamSaver(
  source: ReadableStream<Uint8Array>,
  writableStream: WritableStream<Uint8Array>,
  blockSize = 100 * 1024 * 1024,
) {
  const writer = writableStream.getWriter();
  const reader = source.getReader();
  let buffer = new Uint8Array(0);
  let totalBytes = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (abortController?.signal.aborted) break;

    const { done, value } = await reader.read();
    if (done) break;

    const newBuffer = new Uint8Array(buffer.length + value.length);
    newBuffer.set(buffer, 0);
    newBuffer.set(value, buffer.length);
    buffer = newBuffer;

    if (buffer.length >= blockSize) {
      await writer.write(buffer);
      totalBytes += buffer.length;
      buffer = new Uint8Array(0);
    }
  }

  if (buffer.length > 0) {
    await writer.write(buffer);
    totalBytes += buffer.length;
  }

  await writer.close();
}

async function downloadToFs(
  filename: string,
  source: Promise<ReadableStream>,
  supports: DownloadSupport,
  abortController?: AbortController,
): Promise<void> {
  switch (supports) {
    case DownloadSupport.StreamApi:
    case DownloadSupport.PartialStreamApi: {
      console.log('Using partial stream api');
      const streamSaverWritable = streamSaver.createWriteStream(filename);
      return downloadFileWithBlockBufferStreamSaver(await source, streamSaverWritable, abortController);
    }

    default:
      console.log('Using blob');
      return downloadFileAsBlob(filename, await source);
  }
}
