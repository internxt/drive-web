import { describe, expect, it, vi, beforeEach } from 'vitest';
import { checkConnectionToCloud } from '../../../src/services/network.service';
import errorService from '../../../src/services/error.service';

vi.mock('../../../src/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

describe('Network Service', () => {
  describe('checkConnectionToCloud', () => {
    let xhrMock: Partial<XMLHttpRequest>;

    beforeEach(() => {
      vi.clearAllMocks();

      xhrMock = {
        open: vi.fn(),
        send: vi.fn(),
        onload: null,
        onerror: null,
      };

      vi.spyOn(globalThis, 'XMLHttpRequest').mockImplementation(() => xhrMock as XMLHttpRequest);
    });

    it('should resolve with true when connection succeeds', async () => {
      const promise = checkConnectionToCloud();

      if (xhrMock.onload) {
        xhrMock.onload({} as ProgressEvent);
      }

      const result = await promise;

      expect(result).toBe(true);
      expect(xhrMock.open).toHaveBeenCalledWith('GET', 'https://drive.internxt.com', true);
      expect(xhrMock.send).toHaveBeenCalled();
    });

    it('should reject with an Error when connection fails', async () => {
      const promise = checkConnectionToCloud();

      const errorEvent = {} as ProgressEvent;
      if (xhrMock.onerror) {
        xhrMock.onerror(errorEvent);
      }

      await expect(promise).rejects.toThrow('Failed to connect to cloud');
      expect(errorService.reportError).toHaveBeenCalledWith(errorEvent);
    });
  });
});
