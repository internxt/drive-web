import { AxiosError } from 'axios';
import { AppError } from '@internxt/sdk';
import { AxiosResponseError, AxiosUnknownError } from '@internxt/sdk/dist/shared/types/errors';
import envService from './env.service';

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
    if (err === null || err === undefined) {
      return new AppError('Unknown error');
    }

    if (err instanceof AppError) {
      return err;
    }

    if (err instanceof AxiosResponseError) {
      const data = err.data as { error?: string; message?: string } | undefined;
      const message = data?.message || data?.error || err.message || 'Unknown error';
      const headers = err.xRequestId ? { 'x-request-id': err.xRequestId } : undefined;
      return new AppError(message, err.status, undefined, headers);
    }

    if (err instanceof AxiosUnknownError) {
      return new AppError(err.message || 'Unknown error', err.status, err.code);
    }

    if (err instanceof AxiosError) {
      const axiosError = err as AxiosError<{ error?: string; message?: string }>;
      const responseData = axiosError.response?.data;
      const headers = axiosError.response?.headers as Record<string, string>;
      const message = responseData?.message || responseData?.error || axiosError.message || 'Unknown error';
      return new AppError(message, axiosError.response?.status, undefined, headers);
    }

    if (typeof err === 'string') {
      return new AppError(err);
    }

    if (err instanceof Error) {
      const headers = (err as ErrorWithStatus).headers;
      return new AppError(err.message || 'Unknown error', (err as ErrorWithStatus).status, undefined, headers);
    }

    const map = err as Record<string, unknown>;
    return map.message ? new AppError(map.message as string, map.status as number) : new AppError('Unknown error');
  },
};

export default errorService;
