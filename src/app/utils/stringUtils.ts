import { randomBytes } from 'crypto';

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
  // Base64 yields 4 chars per 3 bytes; compute minimum bytes required
  const numBytes = Math.ceil((size * 3) / 4);
  const buf = randomBytes(numBytes).toString('base64');

  return toBase64UrlSafe(buf).substring(0, size);
};
