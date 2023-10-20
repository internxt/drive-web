export default () => {
  async function uploadFileBlob(
    content: Blob,
    url: string,
    // opts: {
    //   progressCallback: UploadProgressCallback;
    //   abortController?: AbortController;
    // },
  ): Promise<{ etag: string }> {
    try {
      const headers = new Headers();
      headers.append('content-type', 'application/octet-stream');

      const res = await fetch(url, {
        method: 'PUT',
        body: content,
        headers,
        // signal: opts.abortController?.signal,
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

      // opts.progressCallback(content.size, content.size);
      // WITH QUEUE NOT WORKING WELL
      postMessage({ result: 'notifyProgress', size: content.size });
      return { etag };
    } catch (err) {
      if ((err as any).name === 'AbortError') {
        throw new Error('Upload aborted');
      } else {
        throw err;
      }
    }
  }

  self.addEventListener('message', async (event) => {
    const { content, url, opts, uploadIndex } = event.data;
    const { etag } = await uploadFileBlob(content, url); //, opts);

    postMessage({ result: 'success', etag, uploadIndex });
  });
};
