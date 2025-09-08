import downloadFile from 'app/drive/services/download.service/downloadFile';
import { DriveFileData } from 'app/drive/types';

let abortController: AbortController | undefined;

self.addEventListener('message', async (event) => {
  console.log('[DOWNLOAD-WORKER]: Event received -->', event);

  if (event.data.type === 'download') {
    if (event.data.abort) {
      postMessage({ result: 'abort' });
      return;
    }

    try {
      const { file, isWorkspace, isBrave, credentials } = event.data.params as {
        file: DriveFileData;
        isWorkspace: boolean;
        isBrave: boolean;
        abortController: AbortController;
        credentials: any;
      };
      console.log('[DOWNLOAD-WORKER] Downloading file -->', {
        fileName: file.plainName ?? file.name,
        type: file.type,
      });

      abortController = new AbortController();

      const downloadedFile = await downloadFile(
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
  } else if (event.data.type === 'abort') {
    console.log('[DOWNLOAD-WORKER] Received abort → aborting download');
    abortController?.abort();
    postMessage({ result: 'abort' });
  } else {
    console.warn('[DOWNLOAD-WORKER] Received unknown event');
  }
});

export {};
