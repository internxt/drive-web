import { AxiosError } from 'axios';

import AppError from '../models/AppError';

const errorService = {
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
