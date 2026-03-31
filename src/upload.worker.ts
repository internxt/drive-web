import { uploadFile } from 'app/network/upload';
import { HttpClient } from '@internxt/sdk/dist/shared';
import { WORKER_MESSAGE_STATES } from 'app/drive/services/worker.service/types/upload';
import { corsMaskedErrorInterceptor } from 'app/core/factory/sdk/corsErrorInterceptor';

HttpClient.setGlobalInterceptors([corsMaskedErrorInterceptor]);

HttpClient.enableGlobalRetry({
  onRetry(attempt, delay) {
    console.warn(`[WORKER] Rate limit retry attempt ${attempt}, waiting ${delay}ms`);
    postMessage({ result: WORKER_MESSAGE_STATES.RATE_LIMITED, attempt, delay });
  },
});

self.addEventListener('message', async (event) => {
  console.log('[WORKER]: Event received -->', event);

  if (event.data.type === 'upload') {
    if (event.data.abort) {
      postMessage({ result: 'abort' });
      return;
    }

    try {
      const { bucketId, params } = event.data;

      const fileId = await uploadFile(bucketId, {
        ...params,
        progressCallback: (totalBytes, uploadedBytes) => {
          postMessage({
            progress: uploadedBytes / totalBytes,
            uploadedBytes,
            totalBytes,
          });
        },
      });
      postMessage({ result: 'success', fileId });
    } catch (err) {
      console.log('[WORKER] ERROR -->', err);
      const errorCloned = JSON.parse(JSON.stringify(err));
      postMessage({ result: 'error', error: errorCloned });
    }
  } else {
    console.warn('[WORKER] Received unknown event');
  }
});

export {};
