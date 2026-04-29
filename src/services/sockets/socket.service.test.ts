import { beforeEach, describe, expect, vi, afterEach, test } from 'vitest';
import RealtimeService from './socket.service';
import localStorageService from '../local-storage.service';
import envService from '../env.service';
import { SOCKET_EVENTS } from './types/socket.types';
import { EventHandler } from './event-handler.service';

const { mockSocket, ioMock } = vi.hoisted(() => {
  const mockSocket = {
    id: 'mock-socket-id',
    connected: true,
    disconnected: false,
    active: false,
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  };

  const ioMock = vi.fn(() => mockSocket);

  return { mockSocket, ioMock };
});

vi.mock('socket.io-client', () => ({
  default: ioMock,
}));

vi.mock('./event-handler.service', () => ({
  EventHandler: {
    instance: {
      onPlanUpdated: vi.fn(),
      onFileCreated: vi.fn(),
    },
  },
}));

const mockEventHandler = EventHandler.instance as {
  onPlanUpdated: ReturnType<typeof vi.fn>;
  onFileCreated: ReturnType<typeof vi.fn>;
};

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
      if (key === 'notifications') return 'https://notifications.example.com';
      return '';
    });

    vi.spyOn(localStorageService, 'get').mockReturnValue('mock-token-123');

    mockSocket.id = 'mock-socket-id';
    mockSocket.connected = true;
    mockSocket.disconnected = false;
    mockSocket.active = false;
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.connect.mockClear();
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
        service.init(mockEventHandler);
        expect(mockSocket.on).toHaveBeenCalledWith(eventName, expect.any(Function));
      },
    );

    test('When connection is successfully established, then it notifies the application via callback', () => {
      const onConnectedCallback = vi.fn();
      service.init(mockEventHandler, onConnectedCallback);

      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      expect(onConnectedCallback).toHaveBeenCalledTimes(1);
    });

    test.each([
      { isProduction: true, reconnection: true, withCredentials: true, logs: false },
      { isProduction: false, reconnection: false, withCredentials: false, logs: true },
    ])(
      'When running in isProduction=$isProduction environment, then it adjusts reconnection=$reconnection, withCredentials=$withCredentials and logging=$logs',
      ({ isProduction, reconnection, withCredentials, logs }) => {
        vi.spyOn(envService, 'isProduction').mockReturnValue(isProduction);
        (RealtimeService as unknown as { instance: RealtimeService | undefined }).instance = undefined;
        service = RealtimeService.getInstance();

        service.init(mockEventHandler);

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

  describe('Logging behavior', () => {
    const resetServiceWithProduction = (isProduction: boolean) => {
      vi.spyOn(envService, 'isProduction').mockReturnValue(isProduction);
      (RealtimeService as unknown as { instance: RealtimeService | undefined }).instance = undefined;
      return RealtimeService.getInstance();
    };

    test('When not in production, then it logs connecting on init', () => {
      service = resetServiceWithProduction(false);
      service.init(mockEventHandler);
      expect(consoleLogSpy).toHaveBeenCalledWith('[REALTIME]: CONNECTING...');
    });

    test('When in production, then it does not log connecting on init', () => {
      service = resetServiceWithProduction(true);
      service.init(mockEventHandler);
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[REALTIME]: CONNECTING...');
    });

    test('When connected, then it logs the socket id', () => {
      service.init(mockEventHandler);
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();
      expect(consoleLogSpy).toHaveBeenCalledWith('[REALTIME]: CONNECTED WITH ID', mockSocket.id);
    });

    test('When not in production, then it logs on disconnect event', () => {
      service = resetServiceWithProduction(false);
      service.init(mockEventHandler);
      const disconnectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'disconnect')?.[1];
      disconnectHandler?.('transport close');
      expect(consoleLogSpy).toHaveBeenCalledWith('[REALTIME] DISCONNECTED:', 'transport close');
    });

    test('When in production, then it does not log on disconnect event', () => {
      service = resetServiceWithProduction(true);
      service.init(mockEventHandler);
      const disconnectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'disconnect')?.[1];
      disconnectHandler?.('transport close');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[REALTIME] DISCONNECTED:', 'transport close');
    });

    test('When not in production, then it logs errors on connect_error event', () => {
      service = resetServiceWithProduction(false);
      service.init(mockEventHandler);
      const connectErrorHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect_error')?.[1];
      const error = new Error('connection refused');
      connectErrorHandler?.(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[REALTIME] CONNECTION ERROR:', error);
    });

    test('When in production, then it does not log errors on connect_error event', () => {
      service = resetServiceWithProduction(true);
      service.init(mockEventHandler);
      const connectErrorHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect_error')?.[1];
      const error = new Error('connection refused');
      connectErrorHandler?.(error);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('[REALTIME] CONNECTION ERROR:', error);
    });
  });

  describe('Receiving realtime notifications', () => {
    test('When a PLAN_UPDATED event is received, then it calls onPlanUpdated on the event handler', () => {
      service.init(mockEventHandler);
      const eventData = { event: SOCKET_EVENTS.PLAN_UPDATED, payload: { maxSpaceBytes: 2000 } };

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(mockEventHandler.onPlanUpdated).toHaveBeenCalledWith(eventData);
    });

    test('When a FILE_CREATED event is received, then it calls onFileCreated on the event handler', () => {
      service.init(mockEventHandler);
      const eventData = { event: SOCKET_EVENTS.FILE_CREATED, payload: { fileId: '123' } };

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.(eventData);

      expect(mockEventHandler.onFileCreated).toHaveBeenCalledWith(eventData);
    });
  });

  describe('Closing the connection', () => {
    test.each([
      { connected: true, closes: true },
      { connected: false, closes: false },
    ])('When the socket is connected=$connected, then closes=$closes', ({ connected, closes }) => {
      service.init(mockEventHandler);
      mockSocket.connected = connected;

      service.stop();

      if (closes) {
        expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
      } else {
        expect(mockSocket.disconnect).not.toHaveBeenCalled();
      }
    });
  });

  describe('Complete workflow', () => {
    test('When the socket is connected, then receives notifications and disconnects successfully', () => {
      const onConnected = vi.fn();
      service.init(mockEventHandler, onConnected);

      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      const eventHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'event')?.[1];
      eventHandler?.({ event: SOCKET_EVENTS.FILE_CREATED, payload: { fileId: '123' } });

      service.stop();

      expect(onConnected).toHaveBeenCalled();
      expect(mockEventHandler.onFileCreated).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
