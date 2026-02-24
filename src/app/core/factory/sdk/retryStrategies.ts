import { RetryOptions } from '@internxt/sdk/dist/shared';
import dayjs, { Dayjs } from 'dayjs';
import { hasElapsed } from 'services/date.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';

const RATE_LIMIT_TOAST_COOLDOWN_MINUTES = 1;
let lastRateLimitToastShownAt: Dayjs | null = null;

export const resetToastCooldown = (): void => {
  lastRateLimitToastShownAt = null;
};

export const retryStrategies = {
  silent: (label = 'Global'): RetryOptions => ({
    maxRetries: 2,
    onRetry(attempt, delay) {
      console.warn(`[SDK] ${label} retry attempt ${attempt}, waiting ${delay}ms`);
    },
  }),

  withUserNotification: (label: string): RetryOptions => ({
    maxRetries: 5,
    onRetry(attempt, delay) {
      console.warn(`[SDK] ${label} rate limited. Retry attempt ${attempt}, waiting ${delay}ms`);
      const isToastOnCooldown =
        lastRateLimitToastShownAt &&
        !hasElapsed(lastRateLimitToastShownAt, RATE_LIMIT_TOAST_COOLDOWN_MINUTES, 'minute');
      if (!isToastOnCooldown) {
        lastRateLimitToastShownAt = dayjs();
        notificationsService.show({
          text: t('sdk.rateLimitToast'),
          type: ToastType.Warning,
          duration: 60000,
        });
      }
    },
  }),
};
