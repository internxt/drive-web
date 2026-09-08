import { describe, expect, test } from 'vitest';
import { validateUrl } from './urlValidation';

describe('validateUrl', () => {
  const allowedProtocols = ['https:', 'http:'];
  const allowedHostnames = ['internxt.com', 'drive.internxt.com', '127.0.0.1'];

  test('When the URL has a matching protocol and hostname, then it is accepted', () => {
    expect(validateUrl({ urlString: 'https://drive.internxt.com/some/path', allowedProtocols, allowedHostnames })).toBe(
      true,
    );
  });

  test('When the URL is http with the allowed localhost IP, then it is accepted', () => {
    expect(validateUrl({ urlString: 'http://127.0.0.1:9090/login', allowedProtocols, allowedHostnames })).toBe(true);
  });

  test('When the URL has a disallowed protocol, then it is rejected', () => {
    expect(validateUrl({ urlString: 'file:///etc/passwd', allowedProtocols, allowedHostnames })).toBe(false);
  });

  test('When the URL uses the ftp protocol, then it is rejected', () => {
    expect(validateUrl({ urlString: 'ftp://files.internxt.com', allowedProtocols, allowedHostnames })).toBe(false);
  });

  test('When the URL has a different hostname, then it is rejected', () => {
    expect(validateUrl({ urlString: 'https://evil.com', allowedProtocols, allowedHostnames })).toBe(false);
  });

  test('When the URL has a subdomain that attempts to bypass the check, then it is rejected', () => {
    expect(validateUrl({ urlString: 'https://drive.internxt.com.evil.com', allowedProtocols, allowedHostnames })).toBe(
      false,
    );
  });

  test('When the URL hostname contains an allowed hostname as a substring, then it is rejected', () => {
    expect(validateUrl({ urlString: 'https://evilinternxt.com', allowedProtocols, allowedHostnames })).toBe(false);
  });

  test('When the URL string is malformed, then it is rejected', () => {
    expect(validateUrl({ urlString: 'not-a-url', allowedProtocols, allowedHostnames })).toBe(false);
  });

  test('When the URL string is empty, then it is rejected', () => {
    expect(validateUrl({ urlString: '', allowedProtocols, allowedHostnames })).toBe(false);
  });

  test('When the URL has no hostname, then it is rejected', () => {
    expect(validateUrl({ urlString: 'https://', allowedProtocols, allowedHostnames })).toBe(false);
  });

  test('When the URL includes a port, then it is accepted', () => {
    expect(validateUrl({ urlString: 'https://internxt.com:443/path', allowedProtocols, allowedHostnames })).toBe(true);
  });

  test('When the URL is an IPv6 localhost address in brackets, then it is accepted', () => {
    expect(
      validateUrl({
        urlString: 'http://[::1]:9090/login',
        allowedProtocols,
        allowedHostnames: ['127.0.0.1', '[::1]'],
      }),
    ).toBe(true);
  });
});
