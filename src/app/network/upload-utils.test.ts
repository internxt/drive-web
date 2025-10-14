import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { uploadFileUint8Array } from './upload-utils';

vi.mock('axios');

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
