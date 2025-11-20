import streamSaver from 'streamsaver';
import { isFirefox } from 'react-device-detect';
import { ConnectionLostError } from 'app/network/requests';
import { DriveFileData } from '../../types';
import fetchFileStream from './fetchFileStream';
import fetchFileStreamUsingCredentials from './fetchFileStreamUsingCredentials';
import { ErrorMessages } from 'app/core/constants';
import { BlobWritable, downloadFileAsBlob } from './downloadFileAsBlob';

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
  const writableIsSupported = 'WritableStream' in window && streamSaver.WritableStream;

  let support: DownloadSupport;

  if (isCypress) {
    support = DownloadSupport.PartialStreamApi;
  } else if (isBrave) {
    support = DownloadSupport.Blob;
  } else if (writeToFsIsSupported) {
    support = DownloadSupport.StreamApi;
  } else if (writableIsSupported) {
    support = DownloadSupport.PartialStreamApi;
  } else {
    support = DownloadSupport.PartialStreamApi;
  }

  const fileStreamPromise = !sharingOptions
    ? fetchFileStream(
        { ...itemData, bucketId: itemData.bucket },
        { isWorkspace, updateProgressCallback, abortController },
      )
    : fetchFileStreamUsingCredentials(
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
      const fsHandle = await window.showSaveFilePicker({ suggestedName: filename }).catch((_) => {
        abortController?.abort();
        throw new Error(ErrorMessages.FilePickerCancelled);
      });
      // eslint-disable-next-line no-case-declarations
      const destination = await fsHandle.createWritable({ keepExistingData: false });

      return downloadFileUsingStreamApi(await source, destination, abortController);
    case DownloadSupport.PartialStreamApi:
      return downloadFileUsingStreamApi(await source, streamSaver.createWriteStream(filename), abortController);

    default:
      return downloadFileAsBlob(filename, await source);
  }
}
