import { describe, it, expect } from 'vitest';
import { checkIsProduction } from './env.service';

describe('env.service', () => {
  describe('checkIsProduction', () => {
    it('should return true when MODE is production', () => {
      expect(checkIsProduction('production', '')).toBe(true);
    });

    it('should return true when REACT_APP_NODE_ENV is production', () => {
      expect(checkIsProduction('', 'production')).toBe(true);
    });

    it('should return true when both MODE and REACT_APP_NODE_ENV are production', () => {
      expect(checkIsProduction('production', 'production')).toBe(true);
    });

    it('should return false when MODE is staging', () => {
      expect(checkIsProduction('staging', '')).toBe(false);
    });

    it('should return false when MODE is development', () => {
      expect(checkIsProduction('development', '')).toBe(false);
    });

    it('should return false when REACT_APP_NODE_ENV is staging', () => {
      expect(checkIsProduction('', 'staging')).toBe(false);
    });

    it('should return false when REACT_APP_NODE_ENV is development', () => {
      expect(checkIsProduction('', 'development')).toBe(false);
    });

    it('should handle uppercase MODE values', () => {
      expect(checkIsProduction('PRODUCTION', '')).toBe(true);
    });

    it('should handle uppercase REACT_APP_NODE_ENV values', () => {
      expect(checkIsProduction('', 'STAGING')).toBe(false);
    });

    it('should handle mixed case values', () => {
      expect(checkIsProduction('Development', '')).toBe(false);
    });

    it('should return false when both values are empty', () => {
      expect(checkIsProduction('', '')).toBe(false);
    });

    it('should return false when MODE is production but REACT_APP_NODE_ENV is staging', () => {
      expect(checkIsProduction('production', 'staging')).toBe(false);
    });

    it('should return false when MODE is development but REACT_APP_NODE_ENV is production', () => {
      expect(checkIsProduction('development', 'production')).toBe(false);
    });

    it('should handle undefined MODE', () => {
      expect(checkIsProduction(undefined, 'production')).toBe(true);
    });

    it('should handle undefined REACT_APP_NODE_ENV', () => {
      expect(checkIsProduction('production', undefined)).toBe(true);
    });

    it('should return false when MODE is unrecognized value', () => {
      expect(checkIsProduction('test', '')).toBe(false);
    });
  });
});
