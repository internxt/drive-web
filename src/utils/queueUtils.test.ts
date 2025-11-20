import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QueueUtilsService } from './queueUtils';

describe('QueueUtilsService', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  const service = QueueUtilsService.instance;

  const mockMemory = (usedHeap: number, heapLimit: number) => {
    Object.defineProperty(globalThis.window, 'performance', {
      value: { memory: { usedJSHeapSize: usedHeap, jsHeapSizeLimit: heapLimit } },
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('getConcurrencyUsingPerfomance', () => {
    it('should increase concurrency when memory < 70%, respecting max limit', () => {
      mockMemory(60, 100);
      expect(service.getConcurrencyUsingPerfomance(5, 10)).toBe(6);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Memory usage under 70%. Increasing queue concurrency to 6');

      consoleWarnSpy.mockClear();
      expect(service.getConcurrencyUsingPerfomance(10, 10)).toBe(10);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should decrease concurrency when memory >= 80%, not going below 1', () => {
      mockMemory(80, 100);
      expect(service.getConcurrencyUsingPerfomance(5, 10)).toBe(4);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Memory usage reached 80%. Reducing folder upload concurrency.');

      consoleWarnSpy.mockClear();
      expect(service.getConcurrencyUsingPerfomance(1, 10)).toBe(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should maintain concurrency when memory is between 70-80%', () => {
      mockMemory(75, 100);
      expect(service.getConcurrencyUsingPerfomance(5, 10)).toBe(5);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle missing performance.memory API gracefully', () => {
      Object.defineProperty(globalThis.window, 'performance', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(service.getConcurrencyUsingPerfomance(5, 10)).toBe(5);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Memory usage control is not available');
    });

    it('should handle performance API errors gracefully', () => {
      Object.defineProperty(globalThis.window, 'performance', {
        get: () => {
          throw new Error('Performance API error');
        },
        configurable: true,
      });

      expect(service.getConcurrencyUsingPerfomance(5, 10)).toBe(5);
    });
  });
});
