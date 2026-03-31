import { RetryOptions } from '@internxt/sdk/dist/shared';
import dayjs, { Dayjs } from 'dayjs';
import dateService from 'services/date.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';

export const SILENT_MAX_RETRIES = 2;
export const USER_NOTIFICATION_MAX_RETRIES = 5;

export type NotifyUserCallback = () => void;

const RETRY_TOAST_DURATION_MS = 60000;
const RETRY_TOAST_COOLDOWN_MINUTES = 1;
let lastRetryToastShownAt: Dayjs | null = null;

export const notifyUserWithCooldown: NotifyUserCallback = () => {
  const isToastOnCooldown =
    lastRetryToastShownAt && !dateService.hasElapsed(lastRetryToastShownAt, RETRY_TOAST_COOLDOWN_MINUTES, 'minute');
  if (!isToastOnCooldown) {
    lastRetryToastShownAt = dayjs();
    notificationsService.show({
      text: t('sdk.rateLimitToast'),
      type: ToastType.Warning,
      duration: RETRY_TOAST_DURATION_MS,
    });
  }
};

export const retryStrategies = {
  silent: (label = 'Global'): RetryOptions => ({
    maxRetries: SILENT_MAX_RETRIES,
    onRetry(attempt, delay) {
      console.warn(`[SDK] ${label} retry attempt ${attempt}, waiting ${delay}ms`);
    },
  }),

  withUserNotification: (label: string, notifyUser: NotifyUserCallback): RetryOptions => ({
    maxRetries: USER_NOTIFICATION_MAX_RETRIES,
    onRetry(attempt, delay) {
      console.warn(`[SDK] ${label} retry attempt ${attempt}, waiting ${delay}ms`);
      notifyUser();
    },
  }),
};
