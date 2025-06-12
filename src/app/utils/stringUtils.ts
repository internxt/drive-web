import { randomBytes } from 'crypto';
import { Buffer } from 'buffer';

/**
 * Converts a standard Base64 string into a URL-safe Base64 variant:
 *  - Replaces all "+" characters with "-"
 *  - Replaces all "/" characters with "_"
 *  - Strips any trailing "=" padding characters
 *
 * @param base64 - A standard Base64–encoded string
 * @returns The URL-safe Base64 string
 */
export const toBase64UrlSafe = (base64: string): string => {
  return base64
    .replace(/\+/g, '-') // converts "+" to "-"
    .replace(/\//g, '_') // converts "/" to "_"
    .replace(/=+$/, ''); // removes trailing "="
};

/**
 * Converts a URL-safe Base64 string back into a standard Base64 variant:
 *  - Replaces all "-" characters with "+"
 *  - Replaces all "_" characters with "/"
 *  - Adds "=" padding characters at the end until length is a multiple of 4
 *
 * @param urlSafe - A URL-safe Base64–encoded string
 * @returns The standard Base64 string, including any necessary "=" padding
 */
export const fromBase64UrlSafe = (urlSafe: string): string => {
  let base64 = urlSafe
    .replace(/-/g, '+') // convert "-" back to "+"
    .replace(/_/g, '/'); // convert "_" back to "/"

  const missingPadding = (4 - (base64.length % 4)) % 4;
  if (missingPadding > 0) {
    base64 += '='.repeat(missingPadding);
  }
  return base64;
};

/**
 * Generates a cryptographically secure, URL-safe string of a given length.
 *
 * Internally:
 * 1. Calculates how many raw bytes are needed to generate at least `size` Base64 chars.
 * 2. Generates secure random bytes with `crypto.randomBytes()`.
 * 3. Encodes to standard Base64, then makes it URL-safe.
 * 4. Truncates the result to `size` characters.
 *
 * @param size - Desired length of the output string (must be ≥1)
 * @returns A URL-safe string exactly `size` characters long
 */
export const generateRandomStringUrlSafe = (size: number): string => {
  if (size <= 0) {
    throw new Error('Size must be a positive integer');
  }
  // Base64 yields 4 chars per 3 bytes, so it computes the minimum bytes required
  const numBytes = Math.ceil((size * 3) / 4);
  const buf = randomBytes(numBytes).toString('base64');

  return toBase64UrlSafe(buf).substring(0, size);
};

/**
 * Converts a base64 url safe string to uuid v4
 *
 * @example in: `8yqR2seZThOqF4xNngMjyQ` out: `f32a91da-c799-4e13-aa17-8c4d9e0323c9`
 */
export function base64UrlSafetoUUID(base64UrlSafe: string): string {
  const hex = Buffer.from(fromBase64UrlSafe(base64UrlSafe), 'base64').toString('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}
