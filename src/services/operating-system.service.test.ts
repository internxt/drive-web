import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import operatingSystemService from './operating-system.service';

describe('operating-system service', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  const mockNavigatorWithAppVersion = (appVersion: string) => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        appVersion,
      },
      writable: true,
      configurable: true,
    });
  };

  describe('getOperatingSystem', () => {
    it('should detect Windows OS', () => {
      mockNavigatorWithAppVersion('5.0 (Windows NT 10.0; Win64; x64)');

      const result = operatingSystemService.getOperatingSystem();

      expect(result).toBe('WindowsOS');
    });

    it('should detect MacOS', () => {
      mockNavigatorWithAppVersion('5.0 (Macintosh; Intel Mac OS X 10_15_7)');

      const result = operatingSystemService.getOperatingSystem();

      expect(result).toBe('MacOS');
    });

    it('should detect UNIX OS when X11 is present without Linux keyword', () => {
      mockNavigatorWithAppVersion('5.0 (X11; FreeBSD)');

      const result = operatingSystemService.getOperatingSystem();

      expect(result).toBe('UNIXOS');
    });

    it('should detect Linux OS', () => {
      mockNavigatorWithAppVersion('5.0 (Linux; Android 10)');

      const result = operatingSystemService.getOperatingSystem();

      expect(result).toBe('LinuxOS');
    });

    it('should return "Not known" for unrecognized OS', () => {
      mockNavigatorWithAppVersion('5.0 (Unknown OS)');

      const result = operatingSystemService.getOperatingSystem();

      expect(result).toBe('Not known');
    });

    it('should detect Linux OS when both X11 and Linux are present', () => {
      mockNavigatorWithAppVersion('5.0 (X11; Ubuntu; Linux x86_64)');

      const result = operatingSystemService.getOperatingSystem();

      expect(result).toBe('LinuxOS');
    });
  });
});
