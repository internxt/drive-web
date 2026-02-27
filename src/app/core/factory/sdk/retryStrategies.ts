import { RetryOptions } from '@internxt/sdk/dist/shared';

export const SILENT_MAX_RETRIES = 2;
export const USER_NOTIFICATION_MAX_RETRIES = 5;

export type NotifyUserCallback = () => void;

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
