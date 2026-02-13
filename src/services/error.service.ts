import { AxiosError } from 'axios';
import AppError from 'app/core/types';
import envService from './env.service';

interface AxiosErrorResponse {
  error?: string;
  message?: string;
}

interface ErrorWithStatus extends Error {
  status?: number;
}

interface ErrorWithRequestId {
  requestId?: string;
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

    let requestId = (err as any)?.headers?.['x-request-id'];

    if (err instanceof AxiosError) {
      const axiosError = err as AxiosError<AxiosErrorResponse>;

      const responseData = axiosError.response?.data;
      requestId = requestId || axiosError.response?.headers['x-request-id'];

      castedError = new AppError(
        responseData?.error || responseData?.message || 'Unknown error',
        axiosError.response?.status,
        requestId,
      );
    } else if (typeof err === 'string') {
      castedError = new AppError(err, undefined, requestId);
    } else if (err instanceof Error) {
      castedError = new AppError(err.message || 'Unknown error', (err as ErrorWithStatus).status, requestId);
    } else {
      const map = err as Record<string, unknown>;
      castedError = map.message ? new AppError(map.message as string, map.status as number, requestId) : castedError;
    }

    return castedError;
  },
};

export default errorService;
