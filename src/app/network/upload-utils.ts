import axios, { AxiosError, AxiosProgressEvent } from 'axios';

export type UploadProgressCallback = (totalBytes: number, uploadedBytes: number) => void;

export async function uploadFileUint8Array(
  content: Uint8Array,
  url: string,
  opts: {
    progressCallback: UploadProgressCallback;
    abortController?: AbortController;
  },
): Promise<{ etag: string | undefined }> {
  try {
    const res = await axios.create()({
      url,
      method: 'PUT',
      data: content,
      headers: {
        'content-type': 'application/octet-stream',
      },
      onUploadProgress: (progress: AxiosProgressEvent) => {
        opts.progressCallback(progress.total ?? 0, progress.loaded);
      },
      signal: opts.abortController?.signal,
    });

    return { etag: res.headers.etag };
  } catch (err) {
    const error = err as AxiosError<any>;

    if (axios.isCancel(error)) {
      throw new Error('Upload aborted');
    } else if ((error as AxiosError).response && (error as AxiosError)?.response?.status === 403) {
      throw new Error('Request has expired');
    } else if ((error as AxiosError).message === 'Network Error') {
      throw error;
    } else {
      throw new Error('Unknown error');
    }
  }
}
