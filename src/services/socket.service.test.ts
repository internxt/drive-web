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
    it('returns the same service instance across multiple requests', () => {
      const instance1 = RealtimeService.getInstance();
      const instance2 = RealtimeService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Event constants', () => {
    it('provides predefined event types for subscription', () => {
      expect(SOCKET_EVENTS).toHaveProperty('FILE_CREATED');
      expect(SOCKET_EVENTS.FILE_CREATED).toBe('FILE_CREATED');
    });
  });

  describe('Establishing realtime connection', () => {
    it('establishes a secure connection with authentication when initialized', () => {
      service.init();

      expect(ioMock).toHaveBeenCalledWith('https://notifications.example.com', {
        auth: { token: 'mock-token-123' },
        reconnection: false,
        withCredentials: true,
      });
    });

    it.each(['connect', 'disconnect', 'connect_error'])(
      'monitors connection lifecycle through %s events',
      (eventName) => {
        service.init();
        expect(mockSocket.on).toHaveBeenCalledWith(eventName, expect.any(Function));
      },
    );

    it('notifies the application when connection is successfully established', () => {
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
      'adjusts behavior for $env environment with reconnection=$reconnection and logging=$logs',
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
    it('provides a unique identifier for the connected client', () => {
      service.init();

      const clientId = service.getClientId();

      expect(clientId).toBe('mock-socket-id');
    });

    it('reports an error when requesting the client ID before connecting', () => {
      expect(() => service.getClientId()).toThrow('Realtime service is not connected');
    });
  });

  describe('Receiving realtime notifications', () => {
    it('delivers realtime notifications to subscribed listeners', () => {
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

    it('prevents event subscriptions when the connection is lost', () => {
      service.init();
      mockSocket.disconnected = true;

      const result = service.onEvent(vi.fn());

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith('[REALTIME] SOCKET IS DISCONNECTED');
    });
  });

  describe('Cleaning up event subscriptions', () => {
    it('clears all active event subscriptions when requested', () => {
      service.init();
      service.removeAllListeners();

      expect(mockSocket.removeAllListeners).toHaveBeenCalledTimes(1);
    });

    it('handles cleanup safely even when not initialized', () => {
      expect(() => service.removeAllListeners()).not.toThrow();
    });
  });

  describe('Closing the connection', () => {
    it.each([
      { connected: true, closes: true },
      { connected: false, closes: false },
    ])('closes the socket only when connected (connected=$connected, closes=$closes)', ({ connected, closes }) => {
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
    it('connects, receives notifications, and disconnects successfully in a complete flow', () => {
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
