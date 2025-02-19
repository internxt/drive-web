import { uploadFile } from 'app/network/upload';

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

      if (err instanceof Error && err.message === 'cannot upload') {
        postMessage({ result: 'error_upload_file', filecontent: err.message });
        console.log('FILE FAILED -->', event.data.params.filecontent);
      } else {
        const errorCloned = JSON.parse(JSON.stringify(err));
        postMessage({ result: 'error', error: errorCloned });
      }
    }
  } else {
    console.warn('[WORKER] Received unknown event');
  }
});

export {};
