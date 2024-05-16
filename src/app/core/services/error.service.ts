import * as Sentry from '@sentry/react';
import { CaptureContext } from '@sentry/types';
import { AxiosError } from 'axios';
import AppError from '../types';

const errorService = {
  /**
   * Reports an error to Sentry
   *
   * @param exception Excetion to report
   * @param context Context to attach to the exception
   */
  reportError(exception: unknown, context?: CaptureContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR_CATCHED]: This error has been catched and is being reported to Sentry', exception);
    }
    Sentry.captureException(exception, context);
  },
  addBreadcrumb(breadcrumbProps: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumbProps);
  },
  castError(err: unknown): AppError {
    let castedError: AppError = new AppError('Unknown error');

    if ((err as AxiosError).isAxiosError !== undefined) {
      const axiosError = err as AxiosError;
      castedError =
        new AppError(
          axiosError.response?.data.error || axiosError.response?.data.message,
          axiosError.response?.status,
        ) || castedError;
    } else if (typeof err === 'string') {
      castedError = new AppError(err);
    } else if (err instanceof Error) {
      const status = (err as { status?: number }).status;
      const code = (err as { code?: string })?.code;
      castedError = new AppError(err.message, status, code);
    } else {
      const map = err as Record<string, unknown>;
      castedError = map.message
        ? new AppError(map.message as string, map.status as number, map?.code as string | undefined)
        : castedError;
    }

    return castedError;
  },
};

export default errorService;
