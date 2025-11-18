import { describe, it, expect } from 'vitest';
import screenService from './screen.service';

describe('screenService', () => {
  const setWindowSize = (width: number, height: number) => {
    Object.defineProperty(globalThis.window, 'innerWidth', { value: width, writable: true, configurable: true });
    Object.defineProperty(globalThis.window, 'innerHeight', { value: height, writable: true, configurable: true });
  };

  describe('getInnerWidth and getInnerHeight', () => {
    it('should return current window dimensions', () => {
      setWindowSize(1920, 1080);
      expect(screenService.getInnerWidth()).toBe(1920);
      expect(screenService.getInnerHeight()).toBe(1080);

      setWindowSize(768, 800);
      expect(screenService.getInnerWidth()).toBe(768);
      expect(screenService.getInnerHeight()).toBe(800);
    });
  });

  describe('isLg', () => {
    it('should return true when screen width is greater than lg breakpoint (1024px)', () => {
      setWindowSize(1025, 1080);
      expect(screenService.isLg()).toBe(true);
    });

    it('should return false when screen width is at or below lg breakpoint', () => {
      setWindowSize(1024, 1080);
      expect(screenService.isLg()).toBe(false);

      setWindowSize(768, 1080);
      expect(screenService.isLg()).toBe(false);
    });
  });
});
