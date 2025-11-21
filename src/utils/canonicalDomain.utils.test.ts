import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isWhitelistedPath,
  buildCanonicalUrlFromParts,
  buildSafeCanonicalUrl,
  enforceCanonicalDriveDomain,
  CANONICAL_DRIVE_ORIGIN,
} from './canonicalDomain.utils';

vi.mock('services/env.service', () => ({
  default: {
    isProduction: vi.fn(),
    getVariable: vi.fn(),
  },
}));

import envService from 'services/env.service';
const mockEnvService = envService as {
  isProduction: ReturnType<typeof vi.fn>;
  getVariable: ReturnType<typeof vi.fn>;
};

describe('canonicalDomain.utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isWhitelistedPath', () => {
    it('should return true for whitelisted paths', () => {
      expect(isWhitelistedPath('/sh/file/token123')).toBe(true);
      expect(isWhitelistedPath('/sh/folder/token456')).toBe(true);
      expect(isWhitelistedPath('/d/file/token789')).toBe(true);
      expect(isWhitelistedPath('/d/folder/token000')).toBe(true);
    });

    it('should return false for non-whitelisted paths', () => {
      expect(isWhitelistedPath('/folder/123')).toBe(false);
      expect(isWhitelistedPath('/login')).toBe(false);
      expect(isWhitelistedPath('/')).toBe(false);
    });
  });

  describe('buildCanonicalUrlFromParts', () => {
    it('should build canonical URL with all components', () => {
      expect(buildCanonicalUrlFromParts('/folder/123', '', '')).toBe('https://drive.internxt.com/folder/123');
      expect(buildCanonicalUrlFromParts('/login', '?redirect=/folder/123', '')).toBe(
        'https://drive.internxt.com/login?redirect=/folder/123',
      );
      expect(buildCanonicalUrlFromParts('/drive', '', '#section-1')).toBe('https://drive.internxt.com/drive#section-1');
      expect(buildCanonicalUrlFromParts('/sh/file/token123', '?password=test', '#preview')).toBe(
        'https://drive.internxt.com/sh/file/token123?password=test#preview',
      );
    });

    it('should prevent open redirect attacks', () => {
      const result = buildCanonicalUrlFromParts('//evil.com/malicious', '', '');
      expect(result).toBe(CANONICAL_DRIVE_ORIGIN);
    });

    it('should return CANONICAL_DRIVE_ORIGIN when URL origin differs', () => {
      const result = buildCanonicalUrlFromParts('javascript:alert(1)', '', '');
      expect(result).toBe(CANONICAL_DRIVE_ORIGIN);
    });
  });

  describe('buildSafeCanonicalUrl', () => {
    it('should build canonical URL from current location', () => {
      const result = buildSafeCanonicalUrl();
      expect(result).toContain('https://drive.internxt.com');
    });
  });

  describe('enforceCanonicalDriveDomain', () => {
    it('should skip redirect in non-production environment', () => {
      mockEnvService.isProduction.mockReturnValue(false);
      mockEnvService.getVariable.mockReturnValue('false');

      expect(() => enforceCanonicalDriveDomain()).not.toThrow();
      expect(mockEnvService.isProduction).toHaveBeenCalled();
    });

    it('should skip redirect when dontRedirect is set', () => {
      mockEnvService.isProduction.mockReturnValue(true);
      mockEnvService.getVariable.mockReturnValue('true');

      expect(() => enforceCanonicalDriveDomain()).not.toThrow();
      expect(mockEnvService.getVariable).toHaveBeenCalledWith('dontRedirect');
    });

    it('should not throw when called in production with dontRedirect false', () => {
      mockEnvService.isProduction.mockReturnValue(true);
      mockEnvService.getVariable.mockReturnValue('false');

      expect(() => enforceCanonicalDriveDomain()).not.toThrow();
    });
  });
});
