import { AxiosError } from 'axios';
import { CustomInterceptor } from '@internxt/sdk/dist/shared/http/client';

const RETRY_AFTER_SECONDS = '60';

/**
 * Detects if an axios error is likely a CORS-masked rate limit (429) response.
 *
 * When the server returns 429 without CORS headers, the browser blocks the response
 * entirely and axios reports a generic "Network Error" with no response data.
 *
 * This checks:
 * - No response (browser blocked it)
 * - Request was made (not a config error)
 * - Message is "Network Error" (axios signature for CORS blocks)
 * - Browser is online (not a connectivity issue)
 * - Not a timeout or cancellation (have distinct error codes)
 */
const isCORSMaskedError = (error: AxiosError): boolean => {
  return (
    !error.response &&
    !!error.request &&
    error.message === 'Network Error' &&
    error.code !== 'ECONNABORTED' &&
    error.code !== 'ERR_CANCELED' &&
    self.navigator.onLine
  );
};

/**
 * Axios response interceptor that converts CORS-masked errors into
 * 429 rate-limit errors so the SDK's retryWithBackoff can detect and retry them.
 */
export const corsMaskedErrorInterceptor: CustomInterceptor = {
  response: {
    onRejected: (error: unknown) => {
      const axiosError = error as AxiosError;

      if (isCORSMaskedError(axiosError)) {
        axiosError.response = {
          status: 429,
          data: { message: 'Rate limited (CORS masked)' },
          headers: { 'retry-after': RETRY_AFTER_SECONDS },
          statusText: 'Too Many Requests',
          config: axiosError.config!,
        };
      }

      return Promise.reject(error);
    },
  },
};
