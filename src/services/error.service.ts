import { AxiosError } from 'axios';
import { AppError } from '@internxt/sdk';
import envService from './env.service';

interface AxiosErrorResponse {
  error?: string;
  message?: string;
}

interface ErrorWithStatus extends Error {
  status?: number;
  headers?: Record<string, string>;
}

const errorService = {
  /**
   * Reports an error to Sentry
   *
   * @param exception Exception to report
   * @param context Context to attach to the exception
   */
  reportError(exception: unknown): void {
    if (envService.getVariable('nodeEnv') !== 'development') return;

    console.error('[ERROR]: There was an error: ', exception);
  },

  castError(err: unknown): AppError {
    let castedError: AppError = new AppError('Unknown error');

    if (err instanceof AppError) {
      return err;
    }

    if (err instanceof AxiosError) {
      const axiosError = err as AxiosError<AxiosErrorResponse>;
      const responseData = axiosError.response?.data;
      const headers = axiosError.response?.headers as Record<string, string>;
      const message = responseData?.error || responseData?.message || axiosError.message || 'Unknown error';

      castedError = new AppError(message, axiosError.response?.status, undefined, headers);
    } else if (typeof err === 'string') {
      castedError = new AppError(err);
    } else if (err instanceof Error) {
      const headers = (err as ErrorWithStatus).headers;
      castedError = new AppError(err.message || 'Unknown error', (err as ErrorWithStatus).status, undefined, headers);
    } else {
      const map = err as Record<string, unknown>;
      castedError = map.message ? new AppError(map.message as string, map.status as number) : castedError;
    }

    return castedError;
  },
};

export default errorService;
