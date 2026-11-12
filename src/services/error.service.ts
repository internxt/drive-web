import { AppError } from '@internxt/sdk';
import { AxiosResponseError, AxiosUnknownError } from '@internxt/sdk/dist/shared/types/errors';
import { AxiosError } from 'axios';
import envService from './env.service';

interface ErrorWithStatus extends Error {
  status?: number;
  headers?: Record<string, string>;
}

const isNonBlankString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

const joinNonBlankStrings = (field: unknown): string => [field].flat().filter(isNonBlankString).join(', ');

/**
 * Returns the first response field with readable text. Array fields
 * (e.g. validation errors) are joined by ', '.
 */
const findFirstReadableMessage = (...fields: unknown[]): string | undefined =>
  fields.map(joinNonBlankStrings).find((text) => text !== '');

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
      const message = findFirstReadableMessage(data?.message, data?.error, err.message) ?? 'Unknown error';
      const headers = err.xRequestId ? { 'x-request-id': err.xRequestId } : undefined;
      return new AppError(message, err.status, data?.error, headers);
    }

    if (err instanceof AxiosUnknownError) {
      return new AppError(err.message || 'Unknown error', err.status, err.code);
    }

    if (err instanceof AxiosError) {
      const axiosError = err as AxiosError<{ error?: string; message?: string }>;
      const responseData = axiosError.response?.data;
      const headers = axiosError.response?.headers as Record<string, string>;
      const message =
        findFirstReadableMessage(responseData?.message, responseData?.error, axiosError.message) ?? 'Unknown error';
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
    const message = findFirstReadableMessage(map.message);
    return message ? new AppError(message, map.status as number) : new AppError('Unknown error');
  },
};

export default errorService;
