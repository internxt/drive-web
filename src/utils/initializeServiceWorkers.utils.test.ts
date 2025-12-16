/**
 * @jest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeServiceWorkers } from './initializeServiceWorkers.utils';

describe('Initialize Service Workers', () => {
  let mockRegister: ReturnType<typeof vi.fn>;
  let mockReady: Promise<ServiceWorkerRegistration>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockRegister = vi.fn();
    mockReady = Promise.resolve({} as ServiceWorkerRegistration);

    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        register: mockRegister,
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
    expect(mockRegister).toHaveBeenCalledWith('/video-streaming.js', {
      scope: '/',
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
});
