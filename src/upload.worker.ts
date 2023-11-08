import { uploadFile } from 'app/network/upload';

async function uploadFileBlob(content: Blob, url: string): Promise<{ etag: string }> {
  try {
    const headers = new Headers();
    headers.append('content-type', 'application/octet-stream');

    const res = await fetch(url, {
      method: 'PUT',
      body: content,
      headers,
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Request has expired');
      } else {
        throw new Error('Unknown error');
      }
    }

    const etag = res.headers.get('etag');
    if (!etag) {
      throw new Error('ETag not found in response headers');
    }

    postMessage({ result: 'notifyProgress', size: content.size });
    return { etag };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Upload aborted');
    } else {
      throw err;
    }
  }
}

self.addEventListener('message', async (event) => {
  console.log('[WORKER]: Event received -->', event);

  if (event.data.type === 'upload') {
    if (event.data.abort) {
      postMessage({ result: 'abort', fileId: event.data.fileId });
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
    return;
  } else {
    console.warn('[WORKER] Received unknown event');
  }
});

export {};
