import { describe, it, expect, vi, beforeEach, test } from 'vitest';
import { downloadingFile, downloadUsingBlob, downloadUsingChunks } from './downloadWorker';
import createFileDownloadStream from 'app/drive/services/download.service/createFileDownloadStream';

vi.mock('app/drive/services/download.service/createFileDownloadStream');

describe('Downloading file worker', () => {
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

  describe('Downloading File', () => {
    test('When the download is for other browser than Brave, then the download uses chunks', async () => {
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

      (createFileDownloadStream as any).mockResolvedValue(mockStream);

      await downloadingFile(mockParams, mockCallbacks);

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

    test('When the download is for Brave browser, then the downlaod uses blob', async () => {
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
      (createFileDownloadStream as any).mockResolvedValue(mockStream);

      await downloadingFile(braveParams, mockCallbacks);

      expect(mockCallbacks.onBlob).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockCallbacks.onChunk).not.toHaveBeenCalled();
      expect(mockCallbacks.onSuccess).toHaveBeenCalledWith('123');
    });

    it('When an error occurs, then the error callback is called', async () => {
      const error = new Error('Download failed');
      (createFileDownloadStream as any).mockRejectedValue(error);

      await downloadingFile(mockParams, mockCallbacks);

      expect(mockCallbacks.onError).toHaveBeenCalledWith({});
      expect(mockCallbacks.onSuccess).not.toHaveBeenCalled();
    });

    test('When the download progress changes, then the callback is called', async () => {
      const mockedProgressValue = 75;
      let progressCallback: any;

      (createFileDownloadStream as any).mockImplementation((file, workspace, callback) => {
        progressCallback = callback;
        return Promise.resolve({
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
              .mockResolvedValueOnce({ done: true, value: undefined }),
            releaseLock: vi.fn(),
          }),
        });
      });

      await downloadingFile(mockParams, mockCallbacks);
      progressCallback(mockedProgressValue);

      expect(mockCallbacks.onProgress).toHaveBeenCalledWith(mockedProgressValue);
    });

    test('When the abort controller is provided, then it is used if needed', async () => {
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

      (createFileDownloadStream as any).mockResolvedValue(mockStream);

      await downloadingFile(mockParams, mockCallbacks, customAbortController);

      expect(createFileDownloadStream).toHaveBeenCalledWith(
        mockFile,
        false,
        mockCallbacks.onProgress,
        customAbortController,
        mockParams.credentials,
      );
    });
  });

  describe('Downloading the file as Blob', () => {
    test('When the download starts, then should create a blob from the stream chunks', async () => {
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

      const onBlobReady = vi.fn();

      await downloadUsingBlob(mockStream as any, onBlobReady);

      expect(onBlobReady).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    test('when the abort controller is called, then it should be handled correctly', async () => {
      const mockReader = {
        read: vi.fn(),
        releaseLock: vi.fn(),
      };

      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };

      const onBlobReady = vi.fn();
      const abortSignal = { isAborted: () => true };

      await downloadUsingBlob(mockStream as any, onBlobReady, abortSignal);

      expect(mockReader.read).not.toHaveBeenCalled();
      expect(onBlobReady).not.toHaveBeenCalled();
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    test('when an error occurs, then should release lock', async () => {
      const mockReader = {
        read: vi.fn().mockRejectedValue(new Error('Read failed')),
        releaseLock: vi.fn(),
      };
      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };
      const onBlobReady = vi.fn();

      await expect(downloadUsingBlob(mockStream as any, onBlobReady)).rejects.toThrow('Read failed');

      expect(mockReader.releaseLock).toHaveBeenCalled();
    });
  });

  describe('Downloading the file with chunks', () => {
    test('When the download starts, then should call the callback for each chunk', async () => {
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

      const onChunk = vi.fn();

      await downloadUsingChunks(mockStream as any, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenNthCalledWith(1, expect.any(Uint8Array));
      expect(onChunk).toHaveBeenNthCalledWith(2, expect.any(Uint8Array));
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    test('When an error occurs, then should release lock', async () => {
      const mockReader = {
        read: vi.fn().mockRejectedValue(new Error('Read failed')),
        releaseLock: vi.fn(),
      };
      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };
      const onChunk = vi.fn();

      await expect(downloadUsingChunks(mockStream as any, onChunk)).rejects.toThrow('Read failed');
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    test('When the stream is empty, then should release lock and not call the callback', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };
      const mockStream = {
        getReader: vi.fn().mockReturnValue(mockReader),
      };
      const onChunk = vi.fn();
      await downloadUsingChunks(mockStream as any, onChunk);

      expect(onChunk).not.toHaveBeenCalled();
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });
  });
});
