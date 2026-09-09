import axios, { AxiosError, AxiosProgressEvent } from 'axios';
import { UPLOAD_IDLE_TIMEOUT_MS } from './networkConstants';
import { createStallWatchdog } from './stallWatchdog';

export type UploadProgressCallback = (totalBytes: number, uploadedBytes: number) => void;

export const UPLOAD_STALLED_ERROR_MESSAGE = 'Upload stalled';

export async function uploadFileUint8Array(
  content: Uint8Array,
  url: string,
  opts: {
    progressCallback: UploadProgressCallback;
    abortController?: AbortController;
    idleTimeoutMs?: number;
  },
): Promise<{ etag: string | undefined }> {
  const watchdog = createStallWatchdog(opts.idleTimeoutMs ?? UPLOAD_IDLE_TIMEOUT_MS, opts.abortController?.signal);

  try {
    const res = await axios.create()({
      url,
      method: 'PUT',
      data: content,
      headers: {
        'content-type': 'application/octet-stream',
      },
      onUploadProgress: (progress: AxiosProgressEvent) => {
        watchdog.restart();
        opts.progressCallback(progress.total ?? 0, progress.loaded);
      },
      signal: watchdog.signal,
    });

    return { etag: res.headers.etag };
  } catch (err) {
    const error = err as AxiosError<any>;

    if (watchdog.hasStalled()) {
      throw new Error(UPLOAD_STALLED_ERROR_MESSAGE);
    } else if (axios.isCancel(error)) {
      throw new Error('Upload aborted');
    } else if ((error as AxiosError).response && (error as AxiosError)?.response?.status === 403) {
      throw new Error('Request has expired');
    } else if ((error as AxiosError).message === 'Network Error') {
      throw error;
    } else {
      throw new Error('Unknown error');
    }
  } finally {
    watchdog.stop();
  }
}
