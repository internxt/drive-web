import { describe, expect, vi, beforeEach, test, afterEach } from 'vitest';
import { DownloadWorker } from './downloadWorker';
import createFileDownloadStream from 'app/drive/services/download.service/createFileDownloadStream';

vi.mock('app/drive/services/download.service/createFileDownloadStream', () => ({
  default: vi.fn(),
}));

describe('Download Worker', () => {
  const mockFile = {
    fileId: '123',
    name: 'test.txt',
    plainName: 'test',
    type: 'txt',
  };

  const mockParams = {
    file: mockFile,
    isWorkspace: false,
    isBrave: false,
    credentials: { user: 'test', pass: 'test' },
  } as any;

  let mockCallbacks: {
    onProgress: ReturnType<typeof vi.fn>;
    onSuccess: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onBlob: ReturnType<typeof vi.fn>;
    onChunk: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCallbacks = {
      onProgress: vi.fn(),
      onSuccess: vi.fn(),
      onError: vi.fn(),
      onBlob: vi.fn(),
      onChunk: vi.fn(),
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Singleton pattern', () => {
    test('When accessing the instance, then it should return the same instance', () => {
      const instance1 = DownloadWorker.instance;
      const instance2 = DownloadWorker.instance;

      expect(instance1).toBe(instance2);
    });
  });

  describe('downloadFile method', () => {
    test('When downloading a file for non-Brave browser, then it should use chunks', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      vi.mocked(createFileDownloadStream).mockResolvedValue(mockStream as any);

      const worker = DownloadWorker.instance;
      await worker.downloadFile(mockParams, mockCallbacks);

      expect(createFileDownloadStream).toHaveBeenCalledWith(
        mockFile,
        false,
        mockCallbacks.onProgress,
        expect.any(AbortController),
        mockParams.credentials,
      );

      expect(mockCallbacks.onChunk).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(mockCallbacks.onBlob).not.toHaveBeenCalled();
      expect(mockCallbacks.onSuccess).toHaveBeenCalledWith(mockFile.fileId);
    });

    test('When downloading a file for Brave browser, then it should use blob', async () => {
      const braveParams = { ...mockParams, isBrave: true };
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      vi.mocked(createFileDownloadStream).mockResolvedValue(mockStream as any);

      const worker = DownloadWorker.instance;
      await worker.downloadFile(braveParams, mockCallbacks);

      expect(mockCallbacks.onBlob).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockCallbacks.onChunk).not.toHaveBeenCalled();
      expect(mockCallbacks.onSuccess).toHaveBeenCalledWith(mockFile.fileId);
    });

    test('When an error occurs, then the error callback is called with serialized error', async () => {
      const error = new Error('Download failed');
      vi.mocked(createFileDownloadStream).mockRejectedValue(error);

      const worker = DownloadWorker.instance;
      await worker.downloadFile(mockParams, mockCallbacks);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Download failed',
        }),
      );
      expect(mockCallbacks.onSuccess).not.toHaveBeenCalled();
    });

    test('When a custom abort controller is provided, then it should be used', async () => {
      const customAbortController = new AbortController();
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      vi.mocked(createFileDownloadStream).mockResolvedValue(mockStream as any);

      const worker = DownloadWorker.instance;
      await worker.downloadFile(mockParams, mockCallbacks, customAbortController);

      expect(createFileDownloadStream).toHaveBeenCalledWith(
        mockFile,
        false,
        mockCallbacks.onProgress,
        customAbortController,
        mockParams.credentials,
      );
    });

    test('When progress changes, then the progress callback is called', async () => {
      const mockedProgressValue = 75;
      let capturedProgressCallback: any;

      vi.mocked(createFileDownloadStream).mockImplementation(async (_file, _workspace, progressCallback) => {
        capturedProgressCallback = progressCallback;

        return {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
              .mockResolvedValueOnce({ done: true, value: undefined }),
            releaseLock: vi.fn(),
          }),
        } as any;
      });

      const worker = DownloadWorker.instance;
      await worker.downloadFile(mockParams, mockCallbacks);

      capturedProgressCallback(mockedProgressValue);

      expect(mockCallbacks.onProgress).toHaveBeenCalledWith(mockedProgressValue);
    });

    test('When downloading multiple chunks, then each chunk callback is called', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([4, 5, 6]) })
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([7, 8, 9]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      vi.mocked(createFileDownloadStream).mockResolvedValue(mockStream as any);

      const worker = DownloadWorker.instance;
      await worker.downloadFile(mockParams, mockCallbacks);

      expect(mockCallbacks.onChunk).toHaveBeenCalledTimes(3);
      expect(mockCallbacks.onSuccess).toHaveBeenCalledWith(mockFile.fileId);
    });

    test('When downloading as blob, then a single blob is created from all chunks', async () => {
      const braveParams = { ...mockParams, isBrave: true };
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([4, 5, 6]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      vi.mocked(createFileDownloadStream).mockResolvedValue(mockStream as any);

      const worker = DownloadWorker.instance;
      await worker.downloadFile(braveParams, mockCallbacks);

      expect(mockCallbacks.onBlob).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onBlob).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    test('When the stream is empty, then success is still called', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      vi.mocked(createFileDownloadStream).mockResolvedValue(mockStream as any);

      const worker = DownloadWorker.instance;
      await worker.downloadFile(mockParams, mockCallbacks);

      expect(mockCallbacks.onChunk).not.toHaveBeenCalled();
      expect(mockCallbacks.onSuccess).toHaveBeenCalledWith(mockFile.fileId);
    });
  });
});
