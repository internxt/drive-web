import createFileDownloadStream from 'app/drive/services/download.service/createFileDownloadStream';
import { DriveFileData } from 'app/drive/types';

let abortController: AbortController | undefined;
let abortRequested = false;

self.addEventListener('message', async (event) => {
  const eventType = event.data.type as 'download' | 'abort';

  switch (eventType) {
    case 'download':
      await downloadingFile(event.data.params);
      break;

    case 'abort':
      console.log('[DOWNLOAD-WORKER] Received abort → aborting download');
      abortRequested = true;
      abortController?.abort();
      postMessage({ result: 'abort' });
      break;

    default:
      console.warn('[DOWNLOAD-WORKER] Received unknown event');
      break;
  }
});

const downloadingFile = async (params: {
  file: DriveFileData;
  isWorkspace: boolean;
  isBrave: boolean;
  credentials: any;
}) => {
  try {
    const { file, isWorkspace, isBrave, credentials } = params;
    console.log('[DOWNLOAD-WORKER] Downloading file -->', {
      fileName: file.plainName ?? file.name,
      type: file.type,
    });

    abortController = new AbortController();

    const downloadedFile = await createFileDownloadStream(
      file,
      isWorkspace,
      (progress: number) => {
        postMessage({ result: 'progress', progress });
      },
      abortController,
      credentials,
    );

    if (isBrave) {
      await downloadUsingBlob(downloadedFile);
    } else {
      await downloadUsingChunks(downloadedFile);
    }

    postMessage({ result: 'success', fileId: file.fileId });
  } catch (err) {
    console.log('[DOWNLOAD-WORKER] ERROR -->', err);
    const errorCloned = JSON.parse(JSON.stringify(err));
    postMessage({ result: 'error', error: errorCloned });
  }
};

const downloadUsingBlob = async (downloadedFile: ReadableStream<Uint8Array<ArrayBufferLike>>) => {
  const reader = downloadedFile.getReader();
  const chunks: Uint8Array[] = [];
  let hasMoreData = true;

  if (abortRequested) {
    reader.releaseLock();
    abortRequested = false;
    return;
  }

  while (hasMoreData) {
    const { done, value } = await reader.read();
    hasMoreData = !done;

    if (!done) {
      const chunk =
        value instanceof Uint8Array
          ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
          : new Uint8Array(value);

      chunks.push(chunk);
    }
  }

  const completeBlob = new Blob(chunks as BlobPart[]);

  postMessage({
    result: 'blob',
    blob: completeBlob,
  });
};

const downloadUsingChunks = async (downloadedFile: ReadableStream<Uint8Array<ArrayBufferLike>>) => {
  console.log('[DOWNLOAD-WORKER] Downloading using readable stream');
  const reader = downloadedFile.getReader();
  let hasMoreData = true;

  while (hasMoreData) {
    const { done, value } = await reader.read();
    hasMoreData = !done;

    if (!done) {
      const chunk = value instanceof Uint8Array ? value.slice() : new Uint8Array(value);
      postMessage({ result: 'chunk', chunk }, { transfer: [chunk.buffer] });
    }
  }
};

export {};
