import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { UPLOAD_STALLED_ERROR_MESSAGE, uploadFileUint8Array } from './upload-utils';

vi.mock('axios', async () => {
  const { AxiosError } = await vi.importActual<typeof import('axios')>('axios');
  return {
    default: { isCancel: vi.fn(), create: vi.fn() },
    AxiosError,
  };
});

describe('uploadFileUint8Array error handling', () => {
  let mockAxiosInstance: any;
  let mockProgressCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance = vi.fn();
    mockProgressCallback = vi.fn();
    (axios.create as any) = vi.fn().mockReturnValue(mockAxiosInstance);
    (axios.isCancel as any) = vi.fn();
  });

  it('should throw "Upload aborted" for cancelled requests', async () => {
    (axios.isCancel as any).mockReturnValue(true);
    mockAxiosInstance.mockRejectedValue(new Error('cancelled'));

    await expect(
      uploadFileUint8Array(new Uint8Array([1]), 'https://test.com', { progressCallback: mockProgressCallback }),
    ).rejects.toThrow('Upload aborted');
  });

  it('should throw "Request has expired" for 403 errors', async () => {
    (axios.isCancel as any).mockReturnValue(false);
    mockAxiosInstance.mockRejectedValue({ response: { status: 403 } });

    await expect(
      uploadFileUint8Array(new Uint8Array([1]), 'https://test.com', { progressCallback: mockProgressCallback }),
    ).rejects.toThrow('Request has expired');
  });

  it('should re-throw network errors', async () => {
    (axios.isCancel as any).mockReturnValue(false);
    const networkError = new AxiosError('Network Error');
    networkError.message = 'Network Error';
    mockAxiosInstance.mockRejectedValue(networkError);

    await expect(
      uploadFileUint8Array(new Uint8Array([1]), 'https://test.com', { progressCallback: mockProgressCallback }),
    ).rejects.toBe(networkError);
  });

  it('should throw "Unknown error" for other errors', async () => {
    (axios.isCancel as any).mockReturnValue(false);
    mockAxiosInstance.mockRejectedValue(new Error('Other error'));

    await expect(
      uploadFileUint8Array(new Uint8Array([1]), 'https://test.com', { progressCallback: mockProgressCallback }),
    ).rejects.toThrow('Unknown error');
  });
});

describe('uploadFileUint8Array stall handling', () => {
  type RequestConfig = {
    signal: AbortSignal;
    onUploadProgress: (progress: { loaded: number; total: number }) => void;
  };
  type UploadResponse = { headers: { etag: string } };
  const IDLE_TIMEOUT_MS = 1000;

  const createPendingRequest = () => {
    let config: RequestConfig;
    let resolve: (value: UploadResponse) => void;

    const request = (requestConfig: RequestConfig) =>
      new Promise<UploadResponse>((res, reject) => {
        config = requestConfig;
        resolve = res;
        requestConfig.signal.addEventListener('abort', () => reject(new Error('canceled')));
      });

    return {
      request,
      reportProgress: (loaded: number) => config.onUploadProgress({ loaded, total: 10 }),
      succeed: (etag: string) => resolve({ headers: { etag } }),
    };
  };

  const uploadWith = (request: (config: RequestConfig) => Promise<UploadResponse>) => {
    vi.mocked(axios.create).mockReturnValue(request as unknown as AxiosInstance);

    return uploadFileUint8Array(new Uint8Array([1, 2, 3]), 'https://storage.test/part', {
      progressCallback: vi.fn(),
      idleTimeoutMs: IDLE_TIMEOUT_MS,
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('when no bytes move for the idle window, then it rejects as stalled', async () => {
    const { request } = createPendingRequest();
    const outcome = expect(uploadWith(request)).rejects.toThrow(UPLOAD_STALLED_ERROR_MESSAGE);

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS);

    await outcome;
  });

  test('when progress keeps arriving, then the idle window restarts and the etag is returned', async () => {
    const { request, reportProgress, succeed } = createPendingRequest();
    const upload = uploadWith(request);

    for (let tick = 1; tick <= 5; tick++) {
      await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - 100);
      reportProgress(tick);
    }
    succeed('etag-1');

    await expect(upload).resolves.toEqual({ etag: 'etag-1' });
  });
});
