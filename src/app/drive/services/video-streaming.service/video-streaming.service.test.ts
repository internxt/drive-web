import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChunkRequestPayload, VideoStreamingService, VideoStreamSession } from '.';

const mockSessionId = 'test-session-id';
vi.stubGlobal('crypto', {
  ...crypto,
  randomUUID: () => mockSessionId,
});

describe('VideoStreamingService', () => {
  let mockServiceWorker: ServiceWorker;
  let mockRegistration: ServiceWorkerRegistration;
  let session: VideoStreamSession;
  let onChunkRequest: (request: ChunkRequestPayload) => Promise<Uint8Array>;
  let messageListeners: ((event: MessageEvent) => void)[];
  let controllerChangeListeners: (() => void)[];
  let lastMessageChannelPort: { onmessage: ((event: MessageEvent) => void) | null; close: () => void };

  beforeEach(() => {
    messageListeners = [];
    controllerChangeListeners = [];

    // Mock MessageChannel - capture the port for later use
    global.MessageChannel = vi.fn().mockImplementation(() => {
      lastMessageChannelPort = {
        onmessage: null,
        close: vi.fn(),
      };
      return {
        port1: lastMessageChannelPort,
        port2: {},
      };
    }) as unknown as typeof MessageChannel;

    mockServiceWorker = {
      postMessage: vi.fn().mockImplementation((message) => {
        // Immediately trigger response via MessageChannel
        queueMicrotask(() => {
          if (message.type === 'PING') {
            // PING uses navigator.serviceWorker listeners
            messageListeners.forEach((h) => h({ data: { type: 'PONG' } } as MessageEvent));
          } else if (message.type === 'REGISTER_VIDEO_SESSION') {
            lastMessageChannelPort.onmessage?.({
              data: { type: 'SESSION_REGISTERED', sessionId: message.sessionId },
            } as MessageEvent);
          } else if (message.type === 'UNREGISTER_VIDEO_SESSION') {
            lastMessageChannelPort.onmessage?.({
              data: { type: 'SESSION_UNREGISTERED', sessionId: message.sessionId },
            } as MessageEvent);
          } else if (message.type === 'CLAIM_CLIENTS') {
            lastMessageChannelPort.onmessage?.({
              data: { type: 'CLIENTS_CLAIMED' },
            } as MessageEvent);
          }
        });
      }),
      state: 'activated',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as ServiceWorker;

    mockRegistration = {
      active: mockServiceWorker,
      installing: null,
      waiting: null,
      scope: '/test-scope',
    } as ServiceWorkerRegistration;

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        controller: mockServiceWorker,
        ready: Promise.resolve(mockRegistration),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'message') {
            messageListeners.push(handler as (event: MessageEvent) => void);
          } else if (event === 'controllerchange') {
            controllerChangeListeners.push(handler);
          }
        }),
        removeEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'message') {
            const idx = messageListeners.indexOf(handler as (event: MessageEvent) => void);
            if (idx >= 0) messageListeners.splice(idx, 1);
          }
        }),
      },
      writable: true,
      configurable: true,
    });

    session = {
      fileSize: 1024000,
      mimeType: 'video/mp4',
    };

    onChunkRequest = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('init the service', () => {
    test('When service worker is ready, then registers video session', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);

      await service.init();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        {
          type: 'REGISTER_VIDEO_SESSION',
          sessionId: mockSessionId,
          fileSize: session.fileSize,
          mimeType: session.mimeType,
        },
        expect.any(Array),
      );
      expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('When service is destroyed during init, then does not register session', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      void service.destroy();

      await service.init();

      const registerCalls = (mockServiceWorker.postMessage as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0].type === 'REGISTER_VIDEO_SESSION',
      );
      expect(registerCalls).toHaveLength(0);
    });

    test('When service worker is not available, then throws error', async () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          controller: null,
          ready: Promise.resolve({
            ...mockRegistration,
            active: null,
            installing: null,
            waiting: null,
          }),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      const service = new VideoStreamingService(session, onChunkRequest);

      await expect(service.init()).rejects.toThrow('No SW available');
    });
  });

  describe('Getting video URL', () => {
    test('When called, then returns correct video stream URL', () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      expect(service.getVideoUrl()).toBe(`/video-stream/${mockSessionId}`);
    });
  });

  describe('Destroy the service', () => {
    test('When called, then unregisters session and removes listeners', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      await service.destroy();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith(
        {
          type: 'UNREGISTER_VIDEO_SESSION',
          sessionId: mockSessionId,
        },
        expect.any(Array),
      );
      expect(navigator.serviceWorker.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('When service worker is not available, then only removes listeners', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          controller: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      await service.destroy();

      expect(navigator.serviceWorker.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('When destroy is called multiple times, then only unregisters once', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      vi.clearAllMocks();

      await service.destroy();
      await service.destroy();

      const unregisterCalls = (mockServiceWorker.postMessage as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0].type === 'UNREGISTER_VIDEO_SESSION',
      );
      expect(unregisterCalls).toHaveLength(1);
    });

    test('When unregister times out, then rejects with error', async () => {
      vi.useFakeTimers();

      // Don't auto-respond to unregister
      mockServiceWorker.postMessage = vi.fn().mockImplementation((message) => {
        queueMicrotask(() => {
          if (message.type === 'PING') {
            messageListeners.forEach((h) => h({ data: { type: 'PONG' } } as MessageEvent));
          } else if (message.type === 'REGISTER_VIDEO_SESSION') {
            lastMessageChannelPort.onmessage?.({
              data: { type: 'SESSION_REGISTERED', sessionId: message.sessionId },
            } as MessageEvent);
          }
          // Don't respond to UNREGISTER_VIDEO_SESSION
        });
      });

      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      const destroyPromise = service.destroy();

      await vi.advanceTimersByTimeAsync(6000);

      await expect(destroyPromise).rejects.toThrow();
    });
  });

  describe('chunk request handling', () => {
    test('When valid chunk request is received, then processes and responds', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      const mockPort = { postMessage: vi.fn() };
      const chunkRequest: ChunkRequestPayload = {
        sessionId: mockSessionId,
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      // Trigger chunk request through message listener
      const messageHandler = messageListeners[messageListeners.length - 1];
      messageHandler({
        data: { type: 'CHUNK_REQUEST', payload: chunkRequest },
        ports: [mockPort as unknown as MessagePort],
      } as unknown as MessageEvent);

      await new Promise((r) => setTimeout(r, 0));

      expect(onChunkRequest).toHaveBeenCalledWith(chunkRequest);
      expect(mockPort.postMessage).toHaveBeenCalledWith({
        requestId: 'request-123',
        data: expect.any(Uint8Array),
      });
    });

    test('When chunk request is for different session, then ignores request', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      const mockPort = { postMessage: vi.fn() };
      const chunkRequest: ChunkRequestPayload = {
        sessionId: 'different-session-id',
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      const messageHandler = messageListeners[messageListeners.length - 1];
      messageHandler({
        data: { type: 'CHUNK_REQUEST', payload: chunkRequest },
        ports: [mockPort as unknown as MessagePort],
      } as unknown as MessageEvent);

      await new Promise((r) => setTimeout(r, 0));

      expect(onChunkRequest).not.toHaveBeenCalled();
      expect(mockPort.postMessage).not.toHaveBeenCalled();
    });

    test('When chunk request fails, then sends error response', async () => {
      const errorMessage = 'Failed to fetch chunk';
      const failingOnChunkRequest = vi.fn().mockRejectedValue(new Error(errorMessage));
      const service = new VideoStreamingService(session, failingOnChunkRequest);
      await service.init();

      const mockPort = { postMessage: vi.fn() };
      const chunkRequest: ChunkRequestPayload = {
        sessionId: mockSessionId,
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      const messageHandler = messageListeners[messageListeners.length - 1];
      messageHandler({
        data: { type: 'CHUNK_REQUEST', payload: chunkRequest },
        ports: [mockPort as unknown as MessagePort],
      } as unknown as MessageEvent);

      await new Promise((r) => setTimeout(r, 0));

      expect(mockPort.postMessage).toHaveBeenCalledWith({
        requestId: 'request-123',
        error: errorMessage,
      });
    });

    test('When service is destroyed during chunk fetch, then sends error response', async () => {
      let resolveChunkRequest!: (value: Uint8Array) => void;
      const delayedOnChunkRequest = vi.fn(
        () =>
          new Promise<Uint8Array>((resolve) => {
            resolveChunkRequest = resolve;
          }),
      );

      const service = new VideoStreamingService(session, delayedOnChunkRequest);
      await service.init();

      const mockPort = { postMessage: vi.fn() };
      const chunkRequest: ChunkRequestPayload = {
        sessionId: mockSessionId,
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      const messageHandler = messageListeners[messageListeners.length - 1];
      const requestPromise = messageHandler({
        data: { type: 'CHUNK_REQUEST', payload: chunkRequest },
        ports: [mockPort as unknown as MessagePort],
      } as unknown as MessageEvent);

      void service.destroy();
      resolveChunkRequest(new Uint8Array([1, 2, 3]));
      await requestPromise;

      expect(mockPort.postMessage).toHaveBeenCalledWith({
        requestId: 'request-123',
        error: 'Session destroyed',
      });
    });
  });

  describe('service worker ping', () => {
    test('When existing controller responds to ping, then init succeeds', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);

      await service.init();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'PING' });
    });
  });

  describe('service worker claiming', () => {
    test('When service worker needs claiming, then claims clients', async () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          controller: null,
          ready: Promise.resolve(mockRegistration),
          addEventListener: vi.fn((event: string, handler: () => void) => {
            if (event === 'controllerchange') {
              queueMicrotask(() => {
                Object.defineProperty(global.navigator.serviceWorker, 'controller', {
                  value: mockServiceWorker,
                  writable: true,
                  configurable: true,
                });
                handler();
              });
            }
          }),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      const service = new VideoStreamingService(session, onChunkRequest);

      await service.init();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'CLAIM_CLIENTS' }, expect.any(Array));
    });
  });
});
