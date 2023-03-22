import { AxiosError } from 'axios';
import * as Sentry from '@sentry/react';
import { CaptureContext } from '@sentry/types';
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
      castedError.message = err.message;
    } else {
      const map = err as Record<string, unknown>;
      castedError = map.message ? new AppError(map.message as string, map.status as number) : castedError;
    }

    return castedError;
  },
};

export default errorService;
