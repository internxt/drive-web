import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVideoChunkDownloader } from './useVideoChunkDownloader';
import { downloadChunkFile } from 'app/network/download/v2';
import { binaryStreamToUint8Array } from 'services/stream.service';

vi.mock('app/network/download/v2');
vi.mock('services/stream.service');

describe('Chunk Video Downloader custom hook', () => {
  const mockConfig = {
    bucketId: 'test-bucket',
    fileId: 'test-file',
    mnemonic: 'test-mnemonic',
    credentials: {
      user: 'test-user',
      pass: 'test-pass',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When requesting a chunk, then it downloads and caches it', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockStream = new ReadableStream<Uint8Array>();

    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);
    vi.mocked(binaryStreamToUint8Array).mockResolvedValue(mockData);

    const { result } = renderHook(() => useVideoChunkDownloader(mockConfig));

    const chunkData = await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request',
      start: 0,
      end: 4,
      fileSize: 1000,
    });

    expect(chunkData).toEqual(mockData);
    expect(downloadChunkFile).toHaveBeenCalledWith({
      bucketId: mockConfig.bucketId,
      fileId: mockConfig.fileId,
      mnemonic: mockConfig.mnemonic,
      creds: mockConfig.credentials,
      chunkStart: 0,
      chunkEnd: 4,
      options: { notifyProgress: expect.any(Function) },
    });
    expect(binaryStreamToUint8Array).toHaveBeenCalledWith(mockStream, expect.any(Function));
  });

  test('When requesting the same chunk multiple times, then it returns cached data without re-downloading', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockStream = new ReadableStream<Uint8Array>();

    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);
    vi.mocked(binaryStreamToUint8Array).mockResolvedValue(mockData);

    const { result } = renderHook(() => useVideoChunkDownloader(mockConfig));

    const firstResult = await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request-1',
      start: 0,
      end: 4,
      fileSize: 1000,
    });

    expect(firstResult).toEqual(mockData);
    expect(downloadChunkFile).toHaveBeenCalledTimes(1);

    const secondResult = await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request-2',
      start: 0,
      end: 4,
      fileSize: 1000,
    });

    expect(secondResult).toEqual(mockData);
    expect(downloadChunkFile).toHaveBeenCalledTimes(1);
  });

  test('When requesting different chunk ranges, then it handles them separately', async () => {
    const mockData1 = new Uint8Array([1, 2, 3]);
    const mockData2 = new Uint8Array([4, 5, 6]);
    const mockStream = new ReadableStream<Uint8Array>();

    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);
    vi.mocked(binaryStreamToUint8Array).mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() => useVideoChunkDownloader(mockConfig));

    const chunk1 = await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request-1',
      start: 0,
      end: 2,
      fileSize: 1000,
    });

    const chunk2 = await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request-2',
      start: 3,
      end: 5,
      fileSize: 1000,
    });

    expect(chunk1).toEqual(mockData1);
    expect(chunk2).toEqual(mockData2);
    expect(downloadChunkFile).toHaveBeenCalledTimes(2);
  });

  test('When requesting the same chunk concurrently, then it does not make duplicate requests', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockStream = new ReadableStream<Uint8Array>();

    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);
    vi.mocked(binaryStreamToUint8Array).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockData), 100)),
    );

    const { result } = renderHook(() => useVideoChunkDownloader(mockConfig));

    const [result1, result2] = await Promise.all([
      result.current.handleChunkRequest({
        sessionId: 'test-session',
        requestId: 'test-request-1',
        start: 0,
        end: 4,
        fileSize: 1000,
      }),
      result.current.handleChunkRequest({
        sessionId: 'test-session',
        requestId: 'test-request-2',
        start: 0,
        end: 4,
        fileSize: 1000,
      }),
    ]);

    expect(result1).toEqual(mockData);
    expect(result2).toEqual(mockData);
    expect(downloadChunkFile).toHaveBeenCalledTimes(1);
  });

  test('When download fails, then an error is thrown', async () => {
    const mockError = new Error('Download failed');
    vi.mocked(downloadChunkFile).mockRejectedValue(mockError);

    const { result } = renderHook(() => useVideoChunkDownloader(mockConfig));

    await expect(
      result.current.handleChunkRequest({
        sessionId: 'test-session',
        requestId: 'test-request',
        start: 0,
        end: 4,
        fileSize: 1000,
      }),
    ).rejects.toThrow('Download failed');
  });

  test('When cache exceeds 20 entries, then it removes the oldest entry', async () => {
    const mockStream = new ReadableStream<Uint8Array>();
    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);

    const { result } = renderHook(() => useVideoChunkDownloader(mockConfig));

    for (let i = 0; i < 25; i++) {
      const mockData = new Uint8Array([i]);
      vi.mocked(binaryStreamToUint8Array).mockResolvedValueOnce(mockData);

      await result.current.handleChunkRequest({
        sessionId: 'test-session',
        requestId: `test-request-${i}`,
        start: i * 10,
        end: i * 10 + 9,
        fileSize: 1000,
      });
    }

    const mockData = new Uint8Array([0]);
    vi.mocked(binaryStreamToUint8Array).mockResolvedValueOnce(mockData);

    await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request-first-again',
      start: 0,
      end: 9,
      fileSize: 1000,
    });

    expect(downloadChunkFile).toHaveBeenCalledTimes(26);
  });

  test('When cache is empty and a function to track progress is provided, then the progress is tracked', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockStream = new ReadableStream<Uint8Array>();
    const handleProgress = vi.fn();

    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);
    vi.mocked(binaryStreamToUint8Array).mockImplementation(async (stream, onRead) => {
      if (onRead) {
        onRead(5);
        onRead(10);
      }
      return mockData;
    });

    const configWithProgress = {
      ...mockConfig,
      handleProgress,
    };

    const { result } = renderHook(() => useVideoChunkDownloader(configWithProgress));

    await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request',
      start: 0,
      end: 10,
      fileSize: 1000,
    });

    expect(handleProgress).toHaveBeenCalledWith(0.5);
    expect(handleProgress).toHaveBeenCalledWith(0.95);
  });

  test('When cache is not empty and a function to track progress is provided, then progress is not tracked', async () => {
    const mockData1 = new Uint8Array([1, 2, 3]);
    const mockData2 = new Uint8Array([4, 5, 6]);
    const mockStream = new ReadableStream<Uint8Array>();
    const handleProgress = vi.fn();

    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);
    vi.mocked(binaryStreamToUint8Array).mockImplementation(async (stream, onRead) => {
      if (onRead) {
        onRead(5);
      }
      return mockData1;
    });

    const configWithProgress = {
      ...mockConfig,
      handleProgress,
    };

    const { result } = renderHook(() => useVideoChunkDownloader(configWithProgress));

    await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request-1',
      start: 0,
      end: 10,
      fileSize: 1000,
    });

    expect(handleProgress).toHaveBeenCalled();
    handleProgress.mockClear();

    vi.mocked(binaryStreamToUint8Array).mockImplementation(async (stream, onRead) => {
      if (onRead) {
        onRead(5);
      }
      return mockData2;
    });

    await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request-2',
      start: 10,
      end: 20,
      fileSize: 1000,
    });

    expect(handleProgress).not.toHaveBeenCalled();
  });

  test('When a function to track progress is not provided, then progress is not tracked', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockStream = new ReadableStream<Uint8Array>();
    const onReadCallback = vi.fn();

    vi.mocked(downloadChunkFile).mockResolvedValue(mockStream);
    vi.mocked(binaryStreamToUint8Array).mockImplementation(async (stream, onRead) => {
      if (onRead) {
        onReadCallback();
        onRead(5);
      }
      return mockData;
    });

    const { result } = renderHook(() => useVideoChunkDownloader(mockConfig));

    await result.current.handleChunkRequest({
      sessionId: 'test-session',
      requestId: 'test-request',
      start: 0,
      end: 10,
      fileSize: 1000,
    });

    expect(onReadCallback).toHaveBeenCalled();
  });
});
