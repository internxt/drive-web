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
  let messageListeners: Map<string, (event: MessageEvent) => void>;
  let controllerChangeListeners: Set<() => void>;

  beforeEach(() => {
    messageListeners = new Map();
    controllerChangeListeners = new Set();

    mockServiceWorker = {
      postMessage: vi.fn(),
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
            messageListeners.set('global', handler as (event: MessageEvent) => void);
          } else if (event === 'controllerchange') {
            controllerChangeListeners.add(handler);
          }
        }),
        removeEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'message') {
            messageListeners.delete('global');
          } else if (event === 'controllerchange') {
            controllerChangeListeners.delete(handler);
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
    messageListeners.clear();
    controllerChangeListeners.clear();
  });

  describe('init the service', () => {
    test('When service worker is ready, then registers video session', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);

      await service.init();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({
        type: 'REGISTER_VIDEO_SESSION',
        sessionId: mockSessionId,
        fileSize: session.fileSize,
        mimeType: session.mimeType,
      });
      expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    test('When service is destroyed during init, then does not register session', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      service.destroy();

      await service.init();

      const registerCalls = (mockServiceWorker.postMessage as any).mock.calls.filter(
        (call: any) => call[0].type === 'REGISTER_VIDEO_SESSION',
      );
      expect(registerCalls).toHaveLength(0);
    });

    test('When service worker is not available, then an error indicating so is thrown', async () => {
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

    test('When service worker is installing, then waits for activation', async () => {
      const installingSW = {
        ...mockServiceWorker,
        state: 'installing',
      } as ServiceWorker;

      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          controller: null,
          ready: Promise.resolve({
            ...mockRegistration,
            active: null,
            installing: installingSW,
            waiting: null,
          }),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      const service = new VideoStreamingService(session, onChunkRequest);

      setTimeout(() => {
        Object.defineProperty(installingSW, 'state', { value: 'activated', writable: true });
        const stateChangeHandler = (installingSW.addEventListener as any).mock.calls.find(
          (call: any) => call[0] === 'statechange',
        )?.[1];
        if (stateChangeHandler) stateChangeHandler();
      }, 10);

      await expect(service.init()).rejects.toThrow('No SW available');
    });
  });

  describe('Getting video URL', () => {
    test('When called, then returns correct video stream URL', () => {
      const service = new VideoStreamingService(session, onChunkRequest);

      const url = service.getVideoUrl();

      expect(url).toBe(`/video-stream/${mockSessionId}`);
    });
  });

  describe('Destroy the service', () => {
    test('When called, then unregisters session and removes listeners', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      vi.clearAllMocks();

      service.destroy();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({
        type: 'UNREGISTER_VIDEO_SESSION',
        sessionId: mockSessionId,
      });
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

      service.destroy();

      expect(navigator.serviceWorker.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('chunk request handling', () => {
    test('When valid chunk request is received, then processes and responds', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      const mockPort = {
        postMessage: vi.fn(),
      } as unknown as MessagePort;

      const chunkRequest: ChunkRequestPayload = {
        sessionId: mockSessionId,
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      const messageEvent = {
        data: {
          type: 'CHUNK_REQUEST',
          payload: chunkRequest,
        },
        ports: [mockPort],
      } as unknown as MessageEvent;

      const messageHandler = messageListeners.get('global');
      if (messageHandler) {
        messageHandler(messageEvent);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onChunkRequest).toHaveBeenCalledWith(chunkRequest);
      expect(mockPort.postMessage).toHaveBeenCalledWith({
        requestId: 'request-123',
        data: expect.any(Uint8Array),
      });
    });

    test('When chunk request is for different session, then ignores test', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);
      await service.init();

      const mockPort = {
        postMessage: vi.fn(),
      } as unknown as MessagePort;

      const chunkRequest: ChunkRequestPayload = {
        sessionId: 'different-session-id',
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      const messageEvent = {
        data: {
          type: 'CHUNK_REQUEST',
          payload: chunkRequest,
        },
        ports: [mockPort],
      } as unknown as MessageEvent;

      const messageHandler = messageListeners.get('global');
      await messageHandler?.(messageEvent);

      expect(onChunkRequest).not.toHaveBeenCalled();
      expect(mockPort.postMessage).not.toHaveBeenCalled();
    });

    test('When chunk request fails, then an error indicating so is thrown', async () => {
      const errorMessage = 'Failed to fetch chunk';
      const failingOnChunkRequest = vi.fn().mockRejectedValue(new Error(errorMessage));
      const service = new VideoStreamingService(session, failingOnChunkRequest);
      await service.init();

      const mockPort = {
        postMessage: vi.fn(),
      } as unknown as MessagePort;

      const chunkRequest: ChunkRequestPayload = {
        sessionId: mockSessionId,
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      const messageEvent = {
        data: {
          type: 'CHUNK_REQUEST',
          payload: chunkRequest,
        },
        ports: [mockPort],
      } as unknown as MessageEvent;

      const messageHandler = messageListeners.get('global');
      await messageHandler?.(messageEvent);

      expect(failingOnChunkRequest).toHaveBeenCalledWith(chunkRequest);
      expect(mockPort.postMessage).toHaveBeenCalledWith({
        requestId: 'request-123',
        error: errorMessage,
      });
    });

    test('When service is destroyed during chunk fetch, then an error indicating so is thrown', async () => {
      let resolveChunkRequest!: (value: Uint8Array) => void;
      const delayedOnChunkRequest = vi.fn(
        () =>
          new Promise<Uint8Array>((resolve) => {
            resolveChunkRequest = resolve;
          }),
      );

      const service = new VideoStreamingService(session, delayedOnChunkRequest);
      await service.init();

      const mockPort = {
        postMessage: vi.fn(),
      } as unknown as MessagePort;

      const chunkRequest: ChunkRequestPayload = {
        sessionId: mockSessionId,
        requestId: 'request-123',
        start: 0,
        end: 1024,
        fileSize: session.fileSize,
      };

      const messageEvent = {
        data: {
          type: 'CHUNK_REQUEST',
          payload: chunkRequest,
        },
        ports: [mockPort],
      } as unknown as MessageEvent;

      const messageHandler = messageListeners.get('global');

      const requestPromise = messageHandler?.(messageEvent);
      service.destroy();
      resolveChunkRequest(new Uint8Array([1, 2, 3]));
      await requestPromise;

      expect(mockPort.postMessage).toHaveBeenCalledWith({
        requestId: 'request-123',
        error: 'Session destroyed',
      });
    });
  });

  describe('service worker ping', () => {
    test('When existing controller responds to ping, then returns controller', async () => {
      const service = new VideoStreamingService(session, onChunkRequest);

      let pingMessageHandler: ((event: MessageEvent) => void) | undefined;
      const addEventListenerSpy = vi
        .spyOn(navigator.serviceWorker, 'addEventListener')
        .mockImplementation((event: string, handler: any) => {
          if (event === 'message') {
            pingMessageHandler = handler;
          }
        });

      setTimeout(() => {
        if (pingMessageHandler) {
          pingMessageHandler({ data: { type: 'PONG' } } as MessageEvent);
        }
      }, 10);

      await service.init();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'PING' });
      expect(addEventListenerSpy).toHaveBeenCalled();
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
              setTimeout(() => {
                Object.defineProperty(global.navigator.serviceWorker, 'controller', {
                  value: mockServiceWorker,
                  writable: true,
                  configurable: true,
                });
                handler();
              }, 10);
            }
          }),
          removeEventListener: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      const service = new VideoStreamingService(session, onChunkRequest);

      const mockPort = {
        onmessage: null as ((event: MessageEvent) => void) | null,
      };

      global.MessageChannel = vi.fn().mockImplementation(() => ({
        port1: mockPort,
        port2: {},
      })) as any;

      setTimeout(() => {
        if (mockPort.onmessage) {
          mockPort.onmessage({ data: { type: 'CLIENTS_CLAIMED' } } as MessageEvent);
        }
      }, 10);

      await service.init();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'CLAIM_CLIENTS' }, expect.any(Array));
    });
  });
});
