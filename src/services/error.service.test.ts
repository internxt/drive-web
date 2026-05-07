import { AppError } from '@internxt/sdk';
import { AxiosResponseError, AxiosUnknownError } from '@internxt/sdk/dist/shared/types/errors';
import { AxiosError, AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import envService from './env.service';
import errorService from './error.service';

vi.mock('./env.service', () => ({
  default: { getVariable: vi.fn() },
}));

describe('Error Service', () => {
  const mockEnvService = vi.mocked(envService.getVariable);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createAxiosError = (data: unknown, status?: number, headers?: Record<string, string>): AxiosError => {
    const error = new AxiosError('Request failed');
    if (status !== undefined) {
      error.response = { data, status, statusText: '', headers: headers ?? {}, config: {} as never } as AxiosResponse;
    }
    return error;
  };

  const createAxiosResponseError = (data: unknown, status: number, xRequestId?: string): AxiosResponseError => {
    const response = {
      data,
      status,
      headers: xRequestId ? { 'x-request-id': xRequestId } : {},
    } as AxiosResponse;
    return new AxiosResponseError('Request failed with status code ' + status, 'GET /api/test', response);
  };

  const createAxiosUnknownError = (message: string, hasRequest: boolean, code?: string): AxiosUnknownError => {
    const axiosErr = new AxiosError(message, code);
    if (hasRequest) (axiosErr as any).request = {};
    return new AxiosUnknownError(message, 'GET /api/test', axiosErr);
  };

  describe('reportError', () => {
    test('When an error occurs in development, then it is printed to the console', () => {
      const error = new Error('Test error');
      mockEnvService.mockReturnValue('development');
      errorService.reportError(error);

      expect(console.error).toHaveBeenCalledWith('[ERROR]: There was an error: ', error);
    });
  });

  describe('castError', () => {
    describe('Null and undefined inputs', () => {
      test('When null is provided, then it returns an Unknown error', () => {
        const result = errorService.castError(null);
        expect(result.message).toBe('Unknown error');
      });

      test('When undefined is provided, then it returns an Unknown error', () => {
        const result = errorService.castError(undefined);
        expect(result.message).toBe('Unknown error');
      });
    });

    describe('AppError instance', () => {
      test('When the error is already in the expected format, then it is returned without changes', () => {
        const original = new AppError('Original error', 418, 'ERR_CODE');
        const result = errorService.castError(original);
        expect(result).toStrictEqual(original);
      });
    });

    describe('AxiosResponseError handling', () => {
      test('When the server response includes a message, then it uses that as the error message', () => {
        const result = errorService.castError(createAxiosResponseError({ message: 'Backend message' }, 400));
        expect(result.message).toBe('Backend message');
        expect(result.status).toBe(400);
      });

      test('When the server response includes both a message and an error, then the message takes priority', () => {
        const result = errorService.castError(
          createAxiosResponseError({ error: 'Unauthorized', message: 'Wrong login credentials' }, 401),
        );
        expect(result.message).toBe('Wrong login credentials');
      });

      test('When the server response includes only an error description, then it uses that as the error message', () => {
        const result = errorService.castError(createAxiosResponseError({ error: 'Backend error' }, 422));
        expect(result.message).toBe('Backend error');
        expect(result.status).toBe(422);
      });

      test('When the server response has no readable error information, then it falls back to the default error message', () => {
        const result = errorService.castError(createAxiosResponseError({}, 503));
        expect(result.message).toBe('Request failed with status code 503');
        expect(result.status).toBe(503);
      });

      test('When the server response includes a request identifier, then it is preserved in the error', () => {
        const result = errorService.castError(createAxiosResponseError({ error: 'Fail' }, 500, 'req-abc'));
        expect(result.requestId).toBe('req-abc');
        expect(result.status).toBe(500);
      });

      test('When the server response has no request identifier, then none is set in the error', () => {
        const result = errorService.castError(createAxiosResponseError({ error: 'Fail' }, 500));
        expect(result.requestId).toBeUndefined();
      });

      test('When the server response body is empty, then it falls back to the default error message', () => {
        const result = errorService.castError(createAxiosResponseError(null, 400));
        expect(result.message).toBe('Request failed with status code 400');
        expect(result.status).toBe(400);
      });

      test('When the server response body is unstructured text, then it falls back to the default error message', () => {
        const result = errorService.castError(createAxiosResponseError('Forbidden', 403));
        expect(result.message).toBe('Request failed with status code 403');
        expect(result.status).toBe(403);
      });
    });

    describe('AxiosUnknownError handling', () => {
      test('When the server cannot be reached, then it is treated as an internal server error', () => {
        const result = errorService.castError(createAxiosUnknownError('Network Error', true));
        expect(result.message).toBe('Network Error');
        expect(result.status).toBe(500);
      });

      test('When the request could not be sent due to a configuration issue, then it is treated as a bad request', () => {
        const result = errorService.castError(createAxiosUnknownError('Timeout', false, 'ECONNABORTED'));
        expect(result.message).toBe('Timeout');
        expect(result.status).toBe(400);
        expect(result.code).toBe('ECONNABORTED');
      });

      test('When the error message is empty, then it returns an Unknown error', () => {
        const result = errorService.castError(createAxiosUnknownError('', false));
        expect(result.message).toBe('Unknown error');
      });
    });

    describe('AxiosError handling', () => {
      test('When the server responds with only an error description, then it uses that as the error message', () => {
        const result = errorService.castError(createAxiosError({ error: 'Custom error message' }, 400));
        expect(result.message).toBe('Custom error message');
        expect(result.status).toBe(400);
      });

      test('When the server responds with both a message and an error description, then the message takes priority', () => {
        const result = errorService.castError(
          createAxiosError({ error: 'Unauthorized', message: 'Wrong login credentials' }, 401),
        );
        expect(result.message).toBe('Wrong login credentials');
      });

      test('When the server responds with only a message, then it uses that as the error message', () => {
        const result = errorService.castError(createAxiosError({ message: 'Custom message' }, 404));
        expect(result.message).toBe('Custom message');
        expect(result.status).toBe(404);
      });

      test('When the server responds with no error details, then it shows a generic message', () => {
        const result1 = errorService.castError(createAxiosError({}, 503));
        expect(result1.message).toBe('Request failed');
        expect(result1.status).toBe(503);
      });

      test('When the server does not respond at all, then it falls back to the connection error message', () => {
        const result = errorService.castError(new AxiosError('Network error'));
        expect(result.message).toBe('Network error');
        expect(result.status).toBeUndefined();
      });

      test('When the server includes a request identifier in the response headers, then it is preserved in the error', () => {
        const result = errorService.castError(createAxiosError({ error: 'Fail' }, 500, { 'x-request-id': 'req-123' }));
        expect(result.requestId).toBe('req-123');
        expect(result.status).toBe(500);
      });
    });

    describe('String and Error instance handling', () => {
      test('When a plain text message is provided, then it wraps it into a proper error', () => {
        const result = errorService.castError('Simple error message');
        expect(result.message).toBe('Simple error message');
        expect(result.status).toBeUndefined();
      });

      test('When a native error is provided, then it is converted preserving its original status', () => {
        const result1 = errorService.castError(new Error('Standard error'));
        expect(result1.message).toBe('Standard error');
        expect(result1.status).toBeUndefined();

        const errorWithStatus = Object.assign(new Error('Error with status'), { status: 401 });
        const result2 = errorService.castError(errorWithStatus);
        expect(result2.message).toBe('Error with status');
        expect(result2.status).toBe(401);
      });

      test('When an error has no description, then it returns a default unknown error message', () => {
        const result = errorService.castError(new Error(''));
        expect(result.message).toBe('Unknown error');
      });

      test('When an error carries response headers with a request identifier, then it is preserved in the error', () => {
        const errorWithHeaders = Object.assign(new Error('Error with headers'), {
          status: 500,
          headers: { 'x-request-id': 'req-456' },
        });
        const result = errorService.castError(errorWithHeaders);
        expect(result.requestId).toBe('req-456');
        expect(result.status).toBe(500);
      });
    });

    describe('Object and edge cases', () => {
      test('When an object with error information is provided, then the message and status are extracted', () => {
        const result = errorService.castError({ message: 'Object error', status: 422 });
        expect(result.message).toBe('Object error');
        expect(result.status).toBe(422);
      });

      test('When the error format is unrecognized, then it returns an Unknown error', () => {
        const testCases = [{ foo: 'bar' }, { status: 403 }, 404, false, [1, 2, 3]];

        for (const error of testCases) {
          const result = errorService.castError(error);
          expect(result.message).toBe('Unknown error');
        }
      });
    });
  });
});
