import createFileDownloadStream from 'app/drive/services/download.service/createFileDownloadStream';
import { DriveFileData } from 'app/drive/types';

let abortController: AbortController | undefined;

self.addEventListener('message', async (event) => {
  const eventType = event.data.type as 'download' | 'abort';
  console.log('EVENT TYPE', eventType);

  switch (eventType) {
    case 'download':
      await downloadingFile(event.data.params);
      break;

    case 'abort':
      console.log('[DOWNLOAD-WORKER] Received abort → aborting download');
      abortController?.abort();
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
      console.log('[DOWNLOAD-WORKER] Downloading as blob');
      postMessage(
        {
          result: 'blob',
          readableStream: downloadedFile,
        },
        {
          transfer: [downloadedFile],
        },
      );
      return;
    }

    console.log('[DOWNLOAD-WORKER] Downloading using readable stream');
    const reader = downloadedFile.getReader();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = value instanceof Uint8Array ? value.slice() : new Uint8Array(value);
      postMessage(
        { result: 'chunk', chunk },
        {
          transfer: [chunk.buffer],
        },
      );
    }

    postMessage({ result: 'success', fileId: file.fileId });
  } catch (err) {
    console.log('[DOWNLOAD-WORKER] ERROR -->', err);
    const errorCloned = JSON.parse(JSON.stringify(err));
    postMessage({ result: 'error', error: errorCloned });
  }
};

export {};
