import { downloadingFile } from './workers/downloadWorker';

let abortController: AbortController | undefined;
let abortRequested = false;

const abortSignal = {
  isAborted: () => abortRequested,
};

self.addEventListener('message', async (event) => {
  const eventType = event.data.type as 'download' | 'abort';

  switch (eventType) {
    case 'download':
      await handleDownload(event.data.params);
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

const handleDownload = async (params: { file: any; isWorkspace: boolean; isBrave: boolean; credentials: any }) => {
  abortRequested = false;
  abortController = new AbortController();

  const callbacks = {
    onProgress: (progress: number) => {
      postMessage({ result: 'progress', progress });
    },
    onSuccess: (fileId: string) => {
      postMessage({ result: 'success', fileId });
    },
    onError: (error: any) => {
      postMessage({ result: 'error', error });
    },
    onBlob: (blob: Blob) => {
      postMessage({ result: 'blob', blob });
    },
    onChunk: (chunk: Uint8Array) => {
      postMessage(
        { result: 'chunk', chunk },
        {
          transfer: [chunk.buffer],
        },
      );
    },
  };

  await downloadingFile(params, callbacks, abortController, abortSignal);
};

export {};
