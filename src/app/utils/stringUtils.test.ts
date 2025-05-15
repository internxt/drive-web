import { describe, expect, it } from 'vitest';
import { generateRandomStringUrlSafe, toBase64UrlSafe } from './stringUtils';

describe('stringUtils', () => {
  describe('toBase64UrlSafe', () => {
    it('converts standard Base64 to URL-safe Base64', () => {
      const base64 = 'a+b/c==';
      const urlSafe = toBase64UrlSafe(base64);
      expect(urlSafe).toBe('a-b_c');
    });

    it('removes trailing "=" characters', () => {
      const base64 = 'abcd==';
      const urlSafe = toBase64UrlSafe(base64);
      expect(urlSafe).toBe('abcd');
    });

    it('does not modify already URL-safe Base64 strings', () => {
      const base64 = 'a-b_c';
      const urlSafe = toBase64UrlSafe(base64);
      expect(urlSafe).toBe('a-b_c');
    });
  });

  describe('generateRandomStringUrlSafe', () => {
    const getRandomNumber = (min: number, max: number) => {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    it('generates a string of the specified length', () => {
      const length = getRandomNumber(1, 1000);
      const randomString = generateRandomStringUrlSafe(length);
      expect(randomString).toHaveLength(length);
    });

    it('generates a URL-safe string', () => {
      const randomString = generateRandomStringUrlSafe(1000);
      expect(randomString).not.toMatch(/[+/=]/);
    });

    it('throws an error if size is not positive', () => {
      expect(() => generateRandomStringUrlSafe(0)).toThrow('Size must be a positive integer');
      expect(() => generateRandomStringUrlSafe(-5)).toThrow('Size must be a positive integer');
    });
  });
});
