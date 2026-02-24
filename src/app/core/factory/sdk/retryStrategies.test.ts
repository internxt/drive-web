import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryOptions } from '@internxt/sdk/dist/shared';
import { retryStrategies, resetToastCooldown } from './retryStrategies';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { hasElapsed } from 'services/date.service';

vi.mock('services/date.service', () => ({
  hasElapsed: vi.fn(),
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

const getOnRetry = (options: RetryOptions): ((attempt: number, delay: number) => void) => {
  if (!options.onRetry) throw new Error('onRetry callback was not provided');
  return options.onRetry;
};

const triggerRetryAndVerifyToastShown = (onRetry: (attempt: number, delay: number) => void): void => {
  onRetry(1, 1000);
  expect(notificationsService.show).toHaveBeenCalledTimes(1);
  vi.mocked(notificationsService.show).mockClear();
};

describe('retryStrategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(notificationsService, 'show');
    resetToastCooldown();
  });

  describe('silent', () => {
    it('When a silent strategy is created, then it retries up to 2 times', () => {
      const options = retryStrategies.silent('Test');

      expect(options.maxRetries).toBe(2);
    });

    it('When a request is retried, then it logs a warning without notifying the user', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const options = retryStrategies.silent('Test');

      getOnRetry(options)(1, 1000);

      expect(warnSpy).toHaveBeenCalledWith('[SDK] Test retry attempt 1, waiting 1000ms');
      expect(notificationsService.show).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('withUserNotification', () => {
    it('When a notification strategy is created, then it retries up to 5 times', () => {
      const options = retryStrategies.withUserNotification('Test');

      expect(options.maxRetries).toBe(5);
    });

    it('When a request is retried, then it shows a warning to the user', () => {
      vi.mocked(hasElapsed).mockReturnValue(true);
      const options = retryStrategies.withUserNotification('Test');

      getOnRetry(options)(1, 1000);

      expect(notificationsService.show).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Warning }));
    });

    it('When a request is retried but a warning was recently shown, then no new warning is displayed', () => {
      const onRetry = getOnRetry(retryStrategies.withUserNotification('Test'));
      triggerRetryAndVerifyToastShown(onRetry);

      vi.mocked(hasElapsed).mockReturnValue(false);
      onRetry(2, 1000);

      expect(notificationsService.show).not.toHaveBeenCalled();
    });

    it('When a request is retried after enough time has passed, then a new warning is shown', () => {
      const onRetry = getOnRetry(retryStrategies.withUserNotification('Test'));
      triggerRetryAndVerifyToastShown(onRetry);

      vi.mocked(hasElapsed).mockReturnValue(true);
      onRetry(2, 1000);

      expect(notificationsService.show).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Warning }));
    });

    it('When different clients are retried, then they share the same warning cooldown', () => {
      const onRetryA = getOnRetry(retryStrategies.withUserNotification('A'));
      const onRetryB = getOnRetry(retryStrategies.withUserNotification('B'));
      triggerRetryAndVerifyToastShown(onRetryA);

      vi.mocked(hasElapsed).mockReturnValue(false);
      onRetryB(1, 1000);

      expect(notificationsService.show).not.toHaveBeenCalled();
    });
  });
});
