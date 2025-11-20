import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import operatingSystemService from './operating-system.service';

vi.mock('./operating-system.service');

describe('desktopService', () => {
  const mockFetch = vi.fn();
  const mockPlatforms = {
    platforms: {
      Linux: 'https://internxt.com/downloads/drive-latest.deb',
      Windows: 'https://internxt.com/downloads/drive-latest.exe',
      MacOS: 'https://internxt.com/downloads/drive-latest.dmg',
    },
  };

  const testGetDownloadUrl = async (os: string, platforms: Record<string, unknown> = mockPlatforms) => {
    mockFetch.mockResolvedValueOnce({ json: async () => platforms });
    vi.mocked(operatingSystemService.getOperatingSystem).mockReturnValue(os);
    const { default: desktopService } = await import('./desktop.service');
    return desktopService.getDownloadAppUrl();
  };

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDownloadAppUrl', () => {
    it('should fetch from API and return correct URL for each OS', async () => {
      expect(await testGetDownloadUrl('LinuxOS')).toBe('https://internxt.com/downloads/drive-latest.deb');
      expect(mockFetch).toHaveBeenCalledWith('https://internxt.com/api/download', { method: 'GET' });

      expect(await testGetDownloadUrl('UNIXOS')).toBe('https://internxt.com/downloads/drive-latest.deb');
      expect(await testGetDownloadUrl('WindowsOS')).toBe('https://internxt.com/downloads/drive-latest.exe');
      expect(await testGetDownloadUrl('MacOS')).toBe('https://internxt.com/downloads/drive-latest.dmg');
    });

    it('should return fallback URLs when API does not provide platform URL', async () => {
      const emptyPlatforms = { platforms: {} };
      expect(await testGetDownloadUrl('LinuxOS', emptyPlatforms)).toBe('https://internxt.com/downloads/drive.deb');
      expect(await testGetDownloadUrl('WindowsOS', emptyPlatforms)).toBe('https://internxt.com/downloads/drive.exe');
      expect(await testGetDownloadUrl('MacOS', emptyPlatforms)).toBe('https://internxt.com/downloads/drive.dmg');
    });

    it('should return undefined for unrecognized OS', async () => {
      expect(await testGetDownloadUrl('UnknownOS', { platforms: {} })).toBeUndefined();
    });
  });
});
