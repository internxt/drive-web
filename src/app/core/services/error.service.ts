import * as Sentry from '@sentry/react';
import { CaptureContext } from '@sentry/types';
import { AxiosError } from 'axios';
import AppError from '../types';

interface AxiosErrorResponse {
  error?: string;
  message?: string;
}

interface ErrorWithStatus extends Error {
  status?: number;
}

const errorService = {
  /**
   * Reports an error to Sentry
   *
   * @param exception Exception to report
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

    if (err instanceof AxiosError) {
      const axiosError = err as AxiosError<AxiosErrorResponse>;
      const responseData = axiosError.response?.data;

      castedError = new AppError(
        responseData?.error || responseData?.message || 'Unknown error',
        axiosError.response?.status,
      );
    } else if (typeof err === 'string') {
      castedError = new AppError(err);
    } else if (err instanceof Error) {
      castedError = new AppError(err.message || 'Unknown error', (err as ErrorWithStatus).status);
    } else {
      const map = err as Record<string, unknown>;
      castedError = map.message ? new AppError(map.message as string, map.status as number) : castedError;
    }

    return castedError;
  },
};

export default errorService;
