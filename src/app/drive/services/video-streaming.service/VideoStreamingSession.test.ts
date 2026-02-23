import { describe, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { VideoStreamingSession, VideoStreamingSessionConfig } from './VideoStreamingSession';

const mockCleanup = vi.fn();
const mockHandleChunkRequest = vi.fn();

vi.mock('./index', () => ({
  VideoStreamingService: class {
    cleanup = mockCleanup;
    handleChunkRequest = mockHandleChunkRequest;
  },
}));

const createConfig = (): VideoStreamingSessionConfig => ({
  fileId: 'file-123',
  bucketId: 'bucket-456',
  fileSize: 1000000,
  fileType: 'video/mp4',
  mnemonic: 'test mnemonic',
  credentials: { user: 'user', pass: 'pass' },
});

describe('Video Streaming Session', () => {
  let mockContainer: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = document.createElement('div');
  });

  afterEach(() => {
    document.getElementById('video-iframe')?.remove();
  });

  describe('Initializing', () => {
    test('When init is called, then creates iframe and returns true', async () => {
      const session = new VideoStreamingSession(createConfig());

      const result = await session.init(mockContainer, vi.fn(), vi.fn());

      expect(result).toBe(true);
      expect(mockContainer.querySelector('iframe')).not.toBeNull();
    });

    test('When init is called, then iframe has correct attributes', async () => {
      const session = new VideoStreamingSession(createConfig());

      await session.init(mockContainer, vi.fn(), vi.fn());

      const iframe = mockContainer.querySelector('iframe');
      expect(iframe?.src).toContain('/video-stream/player.html');
      expect(iframe?.id).toBe('video-iframe');
      expect(iframe?.allow).toBe('autoplay');
    });

    test('When init is called, then registers message listener', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const session = new VideoStreamingSession(createConfig());

      await session.init(mockContainer, vi.fn(), vi.fn());

      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Handling messages', () => {
    const dispatchIframeMessage = (iframe: HTMLIFrameElement, type: string, payload: unknown = {}) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type, payload },
          source: iframe.contentWindow,
        }),
      );
    };

    test('When READY message is received, then the state is handled correctly', async () => {
      const onReady = vi.fn();
      const session = new VideoStreamingSession(createConfig());
      await session.init(mockContainer, onReady, vi.fn());
      const iframe = mockContainer.querySelector('iframe')!;

      dispatchIframeMessage(iframe, 'READY', {});

      expect(onReady).toHaveBeenCalled();
    });

    test('When ERROR message is received, then calls the error is handled correctly', async () => {
      const onError = vi.fn();
      const session = new VideoStreamingSession(createConfig());
      await session.init(mockContainer, vi.fn(), onError);
      const iframe = mockContainer.querySelector('iframe')!;

      dispatchIframeMessage(iframe, 'ERROR', { message: 'Playback failed' });

      expect(onError).toHaveBeenCalledWith('Playback failed');
    });

    test('When CHUNK_REQUEST message is received, then the chunk is handled correctly', async () => {
      const chunkData = new Uint8Array([1, 2, 3]);
      mockHandleChunkRequest.mockResolvedValue(chunkData);
      const session = new VideoStreamingSession(createConfig());
      await session.init(mockContainer, vi.fn(), vi.fn());
      const iframe = mockContainer.querySelector('iframe')!;

      dispatchIframeMessage(iframe, 'CHUNK_REQUEST', { requestId: 'req-1', start: 0, end: 1024 });

      await vi.waitFor(() => {
        expect(mockHandleChunkRequest).toHaveBeenCalledWith({
          requestId: 'req-1',
          start: 0,
          end: 1024,
        });
      });
    });
  });

  describe('Destroying the session', () => {
    test('When destroy is called, then cleans up service', async () => {
      const session = new VideoStreamingSession(createConfig());
      await session.init(mockContainer, vi.fn(), vi.fn());

      session.destroy();

      expect(mockCleanup).toHaveBeenCalled();
    });

    test('When destroy is called multiple times, then only cleans up once', async () => {
      const session = new VideoStreamingSession(createConfig());
      await session.init(mockContainer, vi.fn(), vi.fn());

      session.destroy();
      session.destroy();

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    test('When destroy is called, then removes iframe from DOM', async () => {
      const session = new VideoStreamingSession(createConfig());
      await session.init(mockContainer, vi.fn(), vi.fn());

      session.destroy();

      expect(mockContainer.querySelector('iframe')).toBeNull();
    });

    test('When destroy is called, then removes message listener', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const session = new VideoStreamingSession(createConfig());
      await session.init(mockContainer, vi.fn(), vi.fn());

      session.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });
});
