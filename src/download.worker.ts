import { DownloadWorker } from 'app/workers/downloadWorker';

let abortController: AbortController | undefined;
let abortRequested = false;

const handleMessage = async (event: MessageEvent) => {
  const eventType = event.data.type as 'download' | 'abort';

  switch (eventType) {
    case 'download':
      await handleDownload(event.data.params);
      break;

    case 'abort':
      console.log('[DOWNLOAD-WORKER] Received abort → aborting download');
      abortRequested = true;
      abortController?.abort();
      break;

    default:
      console.warn('[DOWNLOAD-WORKER] Received unknown event');
      break;
  }
};

self.addEventListener('message', handleMessage);

const handleDownload = async (params: { file: any; isWorkspace: boolean; credentials: any }) => {
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

    onChunk: (chunk: Uint8Array) => {
      postMessage({ result: 'chunk', chunk }, { transfer: [chunk.buffer] });
    },
  };

  await DownloadWorker.instance.downloadFile(params, callbacks, abortController);
};

export {};
