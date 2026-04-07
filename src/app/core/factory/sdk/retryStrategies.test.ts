import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryOptions } from '@internxt/sdk/dist/shared';
import { retryStrategies, SILENT_MAX_RETRIES, USER_NOTIFICATION_MAX_RETRIES } from './retryStrategies';

const getOnRetry = (options: RetryOptions): ((attempt: number, delay: number) => void) => {
  if (!options.onRetry) throw new Error('onRetry callback was not provided');
  return options.onRetry;
};

describe('retryStrategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('silent', () => {
    it('When a silent strategy is created, then it retries up to the configured max', () => {
      const options = retryStrategies.silent('Test');

      expect(options.maxRetries).toBe(SILENT_MAX_RETRIES);
    });

    it('When a request is retried, then it logs a warning without notifying the user', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const notifyUser = vi.fn();
      const options = retryStrategies.silent('Test');

      getOnRetry(options)(1, 1000);

      expect(warnSpy).toHaveBeenCalledWith('[SDK] Test retry attempt 1, waiting 1000ms');
      expect(notifyUser).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('withUserNotification', () => {
    it('When a notification strategy is created, then it retries up to the configured max', () => {
      const options = retryStrategies.withUserNotification('Test', vi.fn());

      expect(options.maxRetries).toBe(USER_NOTIFICATION_MAX_RETRIES);
    });

    it('When a request is retried, then it calls the notifyUser callback', () => {
      const notifyUser = vi.fn();
      const options = retryStrategies.withUserNotification('Test', notifyUser);

      getOnRetry(options)(1, 1000);

      expect(notifyUser).toHaveBeenCalledOnce();
    });

    it('When a request is retried, then it logs a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const options = retryStrategies.withUserNotification('Test', vi.fn());

      getOnRetry(options)(1, 1000);

      expect(warnSpy).toHaveBeenCalledWith('[SDK] Test retry attempt 1, waiting 1000ms');
      warnSpy.mockRestore();
    });
  });
});
