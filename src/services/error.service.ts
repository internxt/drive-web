import { AxiosError } from 'axios';

const errorService = {
  castError(error: unknown): Error {
    let castedError: Error = new Error('Unknown error');

    if ((error as AxiosError).isAxiosError !== undefined) {
      castedError = (error as AxiosError).response?.data.error || castedError;
    } else if (typeof error === 'string') {
      castedError = new Error(error);
    } else if (error instanceof Error) {
      castedError = error;
    }

    return castedError;
  },
};

export default errorService;
