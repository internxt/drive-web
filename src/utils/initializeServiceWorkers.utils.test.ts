/**
 * @jest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeServiceWorkers } from './initializeServiceWorkers.utils';

describe('Initialize Service Workers', () => {
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockGetRegistration: ReturnType<typeof vi.fn>;
  let mockReady: Promise<ServiceWorkerRegistration>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockRegister = vi.fn();
    mockGetRegistration = vi.fn().mockResolvedValue(undefined);
    mockReady = Promise.resolve({} as ServiceWorkerRegistration);

    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        register: mockRegister,
        getRegistration: mockGetRegistration,
        ready: mockReady,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('When service workers are supported, then it registers both StreamSaver and video streaming workers', async () => {
    const mockStreamSaverRegistration = {
      installing: null,
      waiting: null,
      active: {} as ServiceWorker,
    } as ServiceWorkerRegistration;

    const mockVideoRegistration = {
      installing: null,
      waiting: null,
      active: {} as ServiceWorker,
    } as ServiceWorkerRegistration;

    mockRegister.mockResolvedValueOnce(mockStreamSaverRegistration).mockResolvedValueOnce(mockVideoRegistration);

    await initializeServiceWorkers();

    expect(mockRegister).toHaveBeenCalledTimes(2);
    expect(mockRegister).toHaveBeenCalledWith('/streamsaver/stream-saver.js', {
      scope: '/streamsaver/',
    });
    expect(mockRegister).toHaveBeenCalledWith('/video-stream/video-streaming.js', {
      scope: '/video-stream/',
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('[ServiceWorkers] All workers initialized successfully');
  });

  test('When both workers are already active, then it completes without waiting for activation', async () => {
    const mockStreamSaverRegistration = {
      installing: null,
      waiting: null,
      active: {} as ServiceWorker,
    } as ServiceWorkerRegistration;

    const mockVideoRegistration = {
      installing: null,
      waiting: null,
      active: {} as ServiceWorker,
    } as ServiceWorkerRegistration;

    mockRegister.mockResolvedValueOnce(mockStreamSaverRegistration).mockResolvedValueOnce(mockVideoRegistration);

    const startTime = Date.now();
    await initializeServiceWorkers();
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(100);
    expect(consoleLogSpy).toHaveBeenCalledWith('[ServiceWorkers] All workers initialized successfully');
  });

  test('When there is an existing service worker in the main scope, then it unregisters it before registering new workers', async () => {
    const mockUnregister = vi.fn().mockResolvedValue(true);
    const existingMainScopeRegistration = {
      unregister: mockUnregister,
    } as unknown as ServiceWorkerRegistration;

    mockGetRegistration.mockResolvedValue(existingMainScopeRegistration);

    const mockStreamSaverRegistration = {
      installing: null,
      waiting: null,
      active: {} as ServiceWorker,
    } as ServiceWorkerRegistration;

    const mockVideoRegistration = {
      installing: null,
      waiting: null,
      active: {} as ServiceWorker,
    } as ServiceWorkerRegistration;

    mockRegister.mockResolvedValueOnce(mockStreamSaverRegistration).mockResolvedValueOnce(mockVideoRegistration);

    await initializeServiceWorkers();

    expect(mockGetRegistration).toHaveBeenCalledWith('/');
    expect(mockUnregister).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('[ServiceWorkers] Removed service worker from main scope (/)');
    expect(mockRegister).toHaveBeenCalledTimes(2);
  });
});
