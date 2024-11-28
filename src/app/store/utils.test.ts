import { describe, expect, it } from 'vitest';
import { isTokenExpired } from './utils';

describe('isTokenExpired', () => {
  it('should return true for an expired token', () => {
    const expiredToken = 'header.eyJleHAiOjE2MDAwMDAwMDB9.signature';
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it('should return false for a valid token', () => {
    const futureDate = Math.floor(Date.now() / 1000) + 3600;
    const validToken = `header.${btoa(JSON.stringify({ exp: futureDate }))}.signature`;
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it('should return true for a token with malformed payload', () => {
    const malformedToken = 'header.malformedPayload.signature';
    expect(isTokenExpired(malformedToken)).toBe(true);
  });

  it('should return true for a token without exp field', () => {
    const tokenWithoutExp = `header.${btoa(JSON.stringify({}))}.signature`;
    expect(isTokenExpired(tokenWithoutExp)).toBe(true);
  });

  it('should return false for a token with exp field in future date', () => {
    const futureDate = Math.floor(Date.now() / 1000) + 3600;
    const tokenWithFutureExp = `header.${btoa(JSON.stringify({ exp: futureDate }))}.signature`;
    expect(isTokenExpired(tokenWithFutureExp)).toBe(false);
  });

  it('should return true for a token with exp field in past date', () => {
    const pastDate = Math.floor(Date.now() / 1000) - 3600;
    const tokenWithPastExp = `header.${btoa(JSON.stringify({ exp: pastDate }))}.signature`;
    expect(isTokenExpired(tokenWithPastExp)).toBe(true);
  });
});
