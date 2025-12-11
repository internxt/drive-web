import { describe, expect, vi, beforeEach, test } from 'vitest';
import { VideoStreamingSession, VideoStreamingSessionConfig } from './VideoStreamingSession';
import { VideoStreamingService, ChunkRequestPayload } from './index';
import { downloadChunkFile } from 'app/network/download/v2';
import { binaryStreamToUint8Array } from 'services/stream.service';

vi.mock('./index', () => ({
  VideoStreamingService: vi.fn(),
}));

vi.mock('app/network/download/v2', () => ({
  downloadChunkFile: vi.fn(),
}));

vi.mock('services/stream.service', () => ({
  binaryStreamToUint8Array: vi.fn(),
}));

vi.mock('services', () => ({
  getVideoMimeType: vi.fn(() => 'video/mp4'),
}));

const createMockConfig = (overrides?: Partial<VideoStreamingSessionConfig>): VideoStreamingSessionConfig => ({
  fileId: 'test-file-id',
  bucketId: 'test-bucket-id',
  fileSize: 1000000,
  fileType: 'mp4',
  mnemonic: 'test-mnemonic',
  credentials: { user: 'test-user', pass: 'test-pass' },
  onProgress: vi.fn(),
  ...overrides,
});

describe('VideoStreamingSession', () => {
  let mockServiceInstance: {
    init: ReturnType<typeof vi.fn>;
    getVideoUrl: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockServiceInstance = {
      init: vi.fn().mockResolvedValue(undefined),
      getVideoUrl: vi.fn().mockReturnValue('/video-stream/test-session-id'),
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    (VideoStreamingService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockServiceInstance);
  });

  describe('init', () => {
    test('When initializing the session, then should return video URL after successful init', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);

      await session.init();
      const url = session.getVideoUrl();

      expect(url).toBe('/video-stream/test-session-id');
    });

    test('When initializing the session, then should return false if already destroyed before init', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);

      session.destroy();
      const result = await session.init();

      expect(result).toBe(false);
      expect(VideoStreamingService).not.toHaveBeenCalled();
    });

    test('When initializing the session, then should return false if destroyed during init', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);

      mockServiceInstance.init.mockImplementation(async () => {
        session.destroy();
      });

      const result = await session.init();

      expect(result).toBe(false);
    });
  });

  describe('Get the video URL', () => {
    test('When getting the video URL, then should return null before init', () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);

      expect(session.getVideoUrl()).toBeNull();
    });

    test('When getting the video URL, then should return URL after init', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);

      await session.init();

      expect(session.getVideoUrl()).toBe('/video-stream/test-session-id');
    });
  });

  describe('destroy', () => {
    test('When destroying the session, then should be idempotent and destroy the service only once', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);

      await session.init();
      session.destroy();
      session.destroy();
      session.destroy();

      expect(mockServiceInstance.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Handle Chunk Request', () => {
    let chunkRequestHandler: (request: ChunkRequestPayload) => Promise<Uint8Array>;

    beforeEach(() => {
      (VideoStreamingService as unknown as ReturnType<typeof vi.fn>).mockImplementation((_config, handler) => {
        chunkRequestHandler = handler;
        return mockServiceInstance;
      });
    });

    test('When requesting a chunk, then should download and return the chunk data', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);
      const mockChunkData = new Uint8Array([1, 2, 3, 4, 5]);

      vi.mocked(downloadChunkFile).mockResolvedValue({} as ReadableStream);
      vi.mocked(binaryStreamToUint8Array).mockResolvedValue(mockChunkData);

      await session.init();

      const request: ChunkRequestPayload = {
        sessionId: 'test-session',
        requestId: 'test-request',
        start: 0,
        end: 1000,
        fileSize: 1000000,
      };

      const result = await chunkRequestHandler(request);

      expect(result).toBe(mockChunkData);
      expect(downloadChunkFile).toHaveBeenCalledWith({
        bucketId: config.bucketId,
        fileId: config.fileId,
        mnemonic: config.mnemonic,
        creds: config.credentials,
        chunkStart: 0,
        chunkEnd: 1000,
        options: expect.objectContaining({
          abortController: expect.any(AbortController),
        }),
      });
    });

    test('When requesting the same chunk twice, then should return cached data', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);
      const mockChunkData = new Uint8Array([1, 2, 3, 4, 5]);

      vi.mocked(downloadChunkFile).mockResolvedValue({} as ReadableStream);
      vi.mocked(binaryStreamToUint8Array).mockResolvedValue(mockChunkData);

      await session.init();

      const request: ChunkRequestPayload = {
        sessionId: 'test-session',
        requestId: 'test-request',
        start: 0,
        end: 1000,
        fileSize: 1000000,
      };

      await chunkRequestHandler(request);
      await chunkRequestHandler(request);

      expect(downloadChunkFile).toHaveBeenCalledTimes(1);
    });

    test('When session is destroyed, then an error indicating so is thrown', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);
      const sessionDestroyedError = new Error('Session destroyed');

      await session.init();
      session.destroy();

      const request: ChunkRequestPayload = {
        sessionId: 'test-session',
        requestId: 'test-request',
        start: 0,
        end: 1000,
        fileSize: 1000000,
      };

      await expect(chunkRequestHandler(request)).rejects.toThrow(sessionDestroyedError);
    });

    test('When download fails, then should clean up pending request and propagate error', async () => {
      const config = createMockConfig();
      const session = new VideoStreamingSession(config);
      const networkError = new Error('Network error');

      vi.mocked(downloadChunkFile).mockRejectedValue(networkError);

      await session.init();

      const request: ChunkRequestPayload = {
        sessionId: 'test-session',
        requestId: 'test-request',
        start: 0,
        end: 1000,
        fileSize: 1000000,
      };

      await expect(chunkRequestHandler(request)).rejects.toThrow(networkError);
    });
  });
});
