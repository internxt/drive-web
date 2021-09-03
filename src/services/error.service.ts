import { AxiosError } from 'axios';
import { string } from 'prop-types';

const errorService = {
  castError(error: unknown): Error {
    let castedError: Error = new Error('Unknown error');

    if ((error as AxiosError).isAxiosError !== undefined) {
      castedError = (error as AxiosError).response?.data.error || castedError;
    } else if (typeof error === 'string') {
      castedError = new Error(error);
    } else if (error instanceof Error) {
      castedError = error;
    } else {
      const map = error as Record<string, unknown>;
      castedError = map.message ? new Error(map.message as string) : castedError;
    }

    return castedError;
  },
};

export default errorService;
