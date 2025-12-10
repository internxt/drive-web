import { describe, expect, vi, beforeEach, test } from 'vitest';
import { VideoStreamingSession, VideoStreamingSessionConfig } from './VideoStreamingSession';
import { VideoStreamingService } from './index';

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
});
