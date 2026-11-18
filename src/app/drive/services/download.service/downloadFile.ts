import { ErrorMessages } from 'app/core/constants';
import streamSaver from '../../../../libs/streamSaver';
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

export async function getDownloadSupport(): Promise<DownloadSupport> {
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

  return support;
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

export enum DownloadSupport {
  StreamApi = 'StreamApi',
  PartialStreamApi = 'PartialStreamApi',
  Blob = 'Blob',
}

export interface DownloadToFsOptions {
  filename: string;
  source: Promise<ReadableStream>;
  support: DownloadSupport;
  abortController?: AbortController;
  size?: number;
}

export async function downloadToFs({
  filename,
  source,
  support,
  abortController,
  size,
}: DownloadToFsOptions): Promise<void> {
  switch (support) {
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
      return downloadFileUsingStreamApi(
        await source,
        streamSaver.createWriteStream(filename, { size }),
        abortController,
      );

    default:
      return downloadFileAsBlob(filename, await source);
  }
}
