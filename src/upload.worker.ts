export default () => {
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
    const { content, url, uploadIndex } = event.data;

    try {
      const { etag } = await uploadFileBlob(content, url);
      postMessage({ result: 'success', etag, uploadIndex });
    } catch (error) {
      const errorCloned = JSON.parse(JSON.stringify(error));
      postMessage({ result: 'error', error: errorCloned });
    }
  });
};
