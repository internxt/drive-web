import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosResponse } from 'axios';
import AppError from 'app/core/types';
import errorService from './error.service';
import envService from './env.service';

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

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

  const createAxiosError = (data: unknown, status?: number): AxiosError => {
    const error = new AxiosError('Request failed');
    if (status !== undefined) {
      error.response = { data, status, statusText: '', headers: {}, config: {} as never } as AxiosResponse;
    }
    return error;
  };

  describe('reportError', () => {
    it('displays errors in the console', () => {
      const error = new Error('Test error');

      errorService.reportError(error);

      expect(console.error).toHaveBeenCalledWith('[ERROR]: There was an error: ', error);
    });
  });

  describe('castError', () => {
    describe('AxiosError handling', () => {
      it('uses the error field from API responses when both error and message are present', () => {
        const result1 = errorService.castError(createAxiosError({ error: 'Custom error message' }, 400));
        expect(result1).toBeInstanceOf(AppError);
        expect(result1.message).toBe('Custom error message');
        expect(result1.status).toBe(400);

        const result2 = errorService.castError(
          createAxiosError({ error: 'Error field', message: 'Message field' }, 500),
        );
        expect(result2.message).toBe('Error field');
      });

      it('falls back to the message field from API responses when error field is missing', () => {
        const result = errorService.castError(createAxiosError({ message: 'Custom message' }, 404));
        expect(result.message).toBe('Custom message');
        expect(result.status).toBe(404);
      });

      it('shows a generic message when API responses contain no error details', () => {
        const result1 = errorService.castError(createAxiosError({}, 503));
        expect(result1.message).toBe('Unknown error');
        expect(result1.status).toBe(503);

        const result2 = errorService.castError(new AxiosError('Network error'));
        expect(result2.message).toBe('Unknown error');
        expect(result2.status).toBeUndefined();
      });
    });

    describe('String and Error instance handling', () => {
      it('converts simple text error messages into standardized error objects', () => {
        const result = errorService.castError('Simple error message');
        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe('Simple error message');
        expect(result.status).toBeUndefined();
      });

      it('converts standard errors into application errors and preserves status codes', () => {
        const result1 = errorService.castError(new Error('Standard error'));
        expect(result1.message).toBe('Standard error');
        expect(result1.status).toBeUndefined();

        const errorWithStatus = Object.assign(new Error('Error with status'), { status: 401 });
        const result2 = errorService.castError(errorWithStatus);
        expect(result2.message).toBe('Error with status');
        expect(result2.status).toBe(401);
      });

      it('provides a default message when errors have no description', () => {
        const result = errorService.castError(new Error(''));
        expect(result.message).toBe('Unknown error');
      });
    });

    describe('Object and edge cases', () => {
      it('extracts error information from objects containing message and status', () => {
        const result = errorService.castError({ message: 'Object error', status: 422 });
        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe('Object error');
        expect(result.status).toBe(422);
      });

      it('treats unrecognized error formats as unknown errors', () => {
        const testCases = [{ foo: 'bar' }, { status: 403 }, 404, false, [1, 2, 3]];

        for (const error of testCases) {
          const result = errorService.castError(error);
          expect(result).toBeInstanceOf(AppError);
          expect(result.message).toBe('Unknown error');
        }
      });
    });
  });
});
