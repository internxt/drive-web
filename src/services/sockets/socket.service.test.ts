import { beforeEach, describe, expect, vi, afterEach, test } from 'vitest';
import RealtimeService from './socket.service';
import localStorageService from '../local-storage.service';
import envService from '../env.service';
import { SocketNotConnectedError } from './errors/socket.errors';
import { SOCKET_EVENTS } from './types/socket.types';

const { mockSocket, ioMock } = vi.hoisted(() => {
  const mockSocket = {
    id: 'mock-socket-id',
    connected: true,
    disconnected: false,
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    close: vi.fn(),
  };

  const ioMock = vi.fn(() => mockSocket);

  return { mockSocket, ioMock };
});

vi.mock('socket.io-client', () => ({
  default: ioMock,
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
    vi.spyOn(envService, 'getVariable').mockImplementation((key: string) => {
      if (key === 'nodeEnv') return 'test';
      if (key === 'notifications') return 'https://notifications.example.com';
      return '';
    });

    vi.spyOn(localStorageService, 'get').mockReturnValue('mock-token-123');

    mockSocket.id = 'mock-socket-id';
    mockSocket.connected = true;
    mockSocket.disconnected = false;
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.removeAllListeners.mockClear();
    mockSocket.close.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Service instance management', () => {
    test('When getInstance is called multiple times, then it returns the same service instance', () => {
      const instance1 = RealtimeService.getInstance();
      const instance2 = RealtimeService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Event constants', () => {
    test('When accessing SOCKET_EVENTS, then it provides predefined event types', () => {
      expect(SOCKET_EVENTS.FILE_CREATED).toStrictEqual('FILE_CREATED');
      expect(SOCKET_EVENTS.PLAN_UPDATED).toStrictEqual('PLAN_UPDATED');
    });
  });

  describe('Establishing realtime connection', () => {
    test.each(['connect', 'event', 'disconnect', 'connect_error'])(
      'When init is called, then it monitors connection lifecycle through %s events',
      (eventName) => {
        service.init();
        expect(mockSocket.on).toHaveBeenCalledWith(eventName, expect.any(Function));
      },
    );

    test('When connection is successfully established, then it notifies the application via callback', () => {
      const onConnectedCallback = vi.fn();
      service.init(onConnectedCallback);

      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      expect(onConnectedCallback).toHaveBeenCalledTimes(1);
    });

    test.each([
      { env: 'production', reconnection: true, withCredentials: true, logs: false },
      { env: 'development', reconnection: true, withCredentials: false, logs: true },
    ])(
      'When running in $env environment, then it adjusts reconnection=$reconnection, withCredentials=$withCredentials and logging=$logs',
      ({ env, reconnection, withCredentials, logs }) => {
        vi.spyOn(envService, 'getVariable').mockImplementation((key: string) => {
          if (key === 'nodeEnv') return env;
          if (key === 'notifications') return 'https://notifications.example.com';
          return '';
        });

        service.init();

        expect(ioMock).toHaveBeenCalledWith('https://notifications.example.com', {
          auth: { token: 'mock-token-123' },
          reconnection,
          withCredentials,
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
    test('When getting the client Id after initialization, then it provides a unique identifier', () => {
      service.init();

      const clientId = service.getClientId();

      expect(clientId).toBe('mock-socket-id');
    });

    test('When getting the client id before connecting, then an error indicating so is thrown', () => {
      expect(() => service.getClientId()).toThrow(SocketNotConnectedError);
    });
  });

  describe('Receiving realtime notifications', () => {
    test('When an event is received, then it delivers the notification to subscribed listeners', () => {
      service.init();
      const callback = vi.fn();
      const eventData = { event: 'FILE_CREATED', payload: { fileId: '123' } };

      const cleanup = service.onEvent(callback);

      expect(cleanup).toBeInstanceOf(Function);

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });

    test('When an event is received, then it distributes to all registered handlers', () => {
      service.init();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const eventData = { event: 'PLAN_UPDATED', payload: { maxSpaceBytes: 1000 } };

      service.onEvent(callback1);
      service.onEvent(callback2);

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(callback1).toHaveBeenCalledWith(eventData);
      expect(callback2).toHaveBeenCalledWith(eventData);
    });

    test('When one handler throws an error, then it does not affect other handlers', () => {
      service.init();
      const errorCallback = vi.fn(() => {
        throw new Error('Handler error');
      });
      const successCallback = vi.fn();
      const eventData = { event: 'TEST', payload: {} };

      service.onEvent(errorCallback);
      service.onEvent(successCallback);

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(errorCallback).toHaveBeenCalledWith(eventData);
      expect(successCallback).toHaveBeenCalledWith(eventData);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[REALTIME] Error in event handler:', expect.any(Error));
    });

    test('When a handler is registered before init, then it receives events after initialization', () => {
      const callback = vi.fn();
      const eventData = { event: 'TEST', payload: {} };

      service.onEvent(callback);

      service.init();

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });
  });

  describe('Cleaning up event subscriptions', () => {
    test('When the cleanup function is called, then it removes a specific handler', () => {
      service.init();
      const callback = vi.fn();
      const eventData = { event: 'TEST', payload: {} };

      const cleanup = service.onEvent(callback);

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];

      eventHandler?.(eventData);
      expect(callback).toHaveBeenCalledTimes(1);

      cleanup();

      eventHandler?.(eventData);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('When removing all listeners function is called, then it clears all active event subscriptions', () => {
      service.init();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const eventData = { event: 'TEST', payload: {} };

      service.onEvent(callback1);
      service.onEvent(callback2);

      service.removeAllListeners();

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('When cleanup is called on uninitialized service, then it handles it safely', () => {
      expect(() => service.removeAllListeners()).not.toThrow();
    });
  });

  describe('Closing the connection', () => {
    test.each([
      { connected: true, closes: true },
      { connected: false, closes: false },
    ])(
      'When the socket is connected, then closes it (connected=$connected, closes=$closes)',
      ({ connected, closes }) => {
        service.init();
        mockSocket.connected = connected;

        service.stop();

        if (closes) {
          expect(mockSocket.close).toHaveBeenCalledTimes(1);
        } else {
          expect(mockSocket.close).not.toHaveBeenCalled();
        }
      },
    );
  });

  describe('Complete workflow', () => {
    test('When the socket is connected, then receives notifications and disconnects successfully', () => {
      const onConnected = vi.fn();
      const eventCallback = vi.fn();

      service.init(onConnected);
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      service.onEvent(eventCallback);
      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.({ event: 'FILE_CREATED', payload: { fileId: '123' } });

      service.stop();

      expect(onConnected).toHaveBeenCalled();
      expect(eventCallback).toHaveBeenCalled();
      expect(mockSocket.close).toHaveBeenCalled();
    });
  });
});
