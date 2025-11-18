import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import RealtimeService, { SOCKET_EVENTS } from './socket.service';
import localStorageService from './local-storage.service';
import envService from './env.service';

const { mockSocket, ioMock } = vi.hoisted(() => {
  const mockSocket = {
    id: 'mock-socket-id',
    connected: true,
    disconnected: false,
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    close: vi.fn(),
  };

  const ioMock = vi.fn(() => mockSocket);

  return { mockSocket, ioMock };
});

vi.mock('socket.io-client', () => ({
  default: ioMock,
}));

vi.mock('./local-storage.service', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('./env.service', () => ({
  default: {
    getVariable: vi.fn(),
  },
}));

describe('RealtimeService', () => {
  let service: RealtimeService;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (RealtimeService as unknown as { instance: RealtimeService | undefined }).instance = undefined;
    service = RealtimeService.getInstance();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(envService.getVariable).mockImplementation((key: string) => {
      if (key === 'nodeEnv') return 'test';
      if (key === 'notifications') return 'https://notifications.example.com';
      return '';
    });

    vi.mocked(localStorageService.get).mockReturnValue('mock-token-123');

    mockSocket.id = 'mock-socket-id';
    mockSocket.connected = true;
    mockSocket.disconnected = false;
    mockSocket.on.mockClear();
    mockSocket.removeAllListeners.mockClear();
    mockSocket.close.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Service instance management', () => {
    it('When requesting the service multiple times, then the same instance is returned', () => {
      const instance1 = RealtimeService.getInstance();
      const instance2 = RealtimeService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Event constants', () => {
    it('When accessing event types, then FILE_CREATED event is available', () => {
      expect(SOCKET_EVENTS).toHaveProperty('FILE_CREATED');
      expect(SOCKET_EVENTS.FILE_CREATED).toBe('FILE_CREATED');
    });
  });

  describe('Establishing realtime connection', () => {
    it('When initializing the service, then it connects with authentication and credentials', () => {
      service.init();

      expect(ioMock).toHaveBeenCalledWith('https://notifications.example.com', {
        auth: { token: 'mock-token-123' },
        reconnection: false,
        withCredentials: true,
      });
    });

    it.each(['connect', 'disconnect', 'connect_error'])(
      'When initializing, then %s events are monitored',
      (eventName) => {
        service.init();
        expect(mockSocket.on).toHaveBeenCalledWith(eventName, expect.any(Function));
      },
    );

    it('When connection succeeds, then the callback is notified', () => {
      const onConnectedCallback = vi.fn();
      service.init(onConnectedCallback);

      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      expect(onConnectedCallback).toHaveBeenCalledTimes(1);
    });

    it.each([
      { env: 'production', reconnection: true, logs: false },
      { env: 'development', reconnection: false, logs: true },
    ])(
      'When running in $env, then reconnection is $reconnection and logging is $logs',
      ({ env, reconnection, logs }) => {
        vi.mocked(envService.getVariable).mockImplementation((key: string) => {
          if (key === 'nodeEnv') return env;
          if (key === 'notifications') return 'https://notifications.example.com';
          return '';
        });

        service.init();

        expect(ioMock).toHaveBeenCalledWith('https://notifications.example.com', {
          auth: { token: 'mock-token-123' },
          reconnection,
          withCredentials: true,
        });

        if (logs) {
          expect(consoleLogSpy).toHaveBeenCalledWith('[REALTIME]: CONNECTING...');
        } else {
          expect(consoleLogSpy).not.toHaveBeenCalledWith('[REALTIME]: CONNECTING...');
        }
      },
    );
  });

  describe('Retrieving connection identifier', () => {
    it('When connected, then the unique client ID is provided', () => {
      service.init();

      const clientId = service.getClientId();

      expect(clientId).toBe('mock-socket-id');
    });

    it('When not connected, then an error is raised', () => {
      expect(() => service.getClientId()).toThrow('Realtime service is not connected');
    });
  });

  describe('Receiving realtime notifications', () => {
    it('When subscribing to events, then notifications are received and handled', () => {
      service.init();
      const callback = vi.fn();
      const eventData = { type: 'FILE_CREATED', payload: { fileId: '123' } };

      const result = service.onEvent(callback);

      expect(result).toBe(true);
      expect(mockSocket.on).toHaveBeenCalledWith('event', expect.any(Function));

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });

    it('When connection is lost, then subscription fails gracefully', () => {
      service.init();
      mockSocket.disconnected = true;

      const result = service.onEvent(vi.fn());

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith('[REALTIME] SOCKET IS DISCONNECTED');
    });
  });

  describe('Cleaning up event subscriptions', () => {
    it('When removing listeners, then all active subscriptions are cleared', () => {
      service.init();
      service.removeAllListeners();

      expect(mockSocket.removeAllListeners).toHaveBeenCalledTimes(1);
    });

    it('When cleaning up without initialization, then no errors occur', () => {
      expect(() => service.removeAllListeners()).not.toThrow();
    });
  });

  describe('Closing the connection', () => {
    it.each([
      { connected: true, closes: true },
      { connected: false, closes: false },
    ])('When connection status is $connected, then closing $closes the socket', ({ connected, closes }) => {
      service.init();
      mockSocket.connected = connected;

      service.stop();

      if (closes) {
        expect(mockSocket.close).toHaveBeenCalledTimes(1);
      } else {
        expect(mockSocket.close).not.toHaveBeenCalled();
      }
    });
  });

  describe('Complete workflow', () => {
    it('When using the service end-to-end, then all operations work together', () => {
      const onConnected = vi.fn();
      const eventCallback = vi.fn();

      service.init(onConnected);
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      service.onEvent(eventCallback);
      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.({ type: 'FILE_CREATED' });

      service.stop();

      expect(onConnected).toHaveBeenCalled();
      expect(eventCallback).toHaveBeenCalled();
      expect(mockSocket.close).toHaveBeenCalled();
    });
  });
});
