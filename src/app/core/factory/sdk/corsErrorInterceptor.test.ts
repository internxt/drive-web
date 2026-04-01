import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { corsMaskedErrorInterceptor } from './corsErrorInterceptor';

const createAxiosError = (overrides: Partial<AxiosError> = {}): AxiosError => {
  const error = new AxiosError('Network Error');
  error.request = {};
  error.response = undefined;
  error.code = undefined;
  Object.assign(error, overrides);
  return error;
};

describe('corsMaskedErrorInterceptor', () => {
  const onRejected = corsMaskedErrorInterceptor.response?.onRejected as (error: unknown) => Promise<never>;

  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('When a CORS-masked network error occurs while online, then it converts it to a 429 response', async () => {
    const error = createAxiosError();

    await expect(onRejected(error)).rejects.toMatchObject({
      status: 429,
      headers: { 'retry-after': '60' },
      response: {
        status: 429,
        headers: { 'retry-after': '60' },
      },
    });
  });

  const nonRetryableCases = [
    {
      description: 'the browser is offline',
      overrides: {},
      navigatorOnLine: false,
    },
    {
      description: 'the error is a timeout',
      overrides: { code: 'ECONNABORTED' },
      navigatorOnLine: true,
    },
    {
      description: 'the error is a cancellation',
      overrides: { code: 'ERR_CANCELED' },
      navigatorOnLine: true,
    },
    {
      description: 'the error already has a response',
      overrides: {
        response: {
          status: 500,
          data: { message: 'Server error' },
          headers: {},
          statusText: 'Internal Server Error',
          config: { headers: new AxiosHeaders() },
        },
      },
      navigatorOnLine: true,
    },
    {
      description: 'the error message is not "Network Error"',
      overrides: { message: 'Something else' },
      navigatorOnLine: true,
    },
  ];

  it.each(nonRetryableCases)(
    'When $description, then it does not convert the error',
    async ({ overrides, navigatorOnLine }) => {
      vi.stubGlobal('navigator', { onLine: navigatorOnLine });
      const error = createAxiosError(overrides as Partial<AxiosError>);

      await expect(onRejected(error)).rejects.toMatchObject({
        response: error.response,
      });
    },
  );
});
