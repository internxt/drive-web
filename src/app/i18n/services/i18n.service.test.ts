import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockInit = vi.fn().mockResolvedValue(undefined);
const mockUse = vi.fn().mockReturnThis();

vi.mock('i18next', () => ({
  default: { use: mockUse, init: mockInit },
}));
vi.mock('i18next-browser-languagedetector', () => ({ default: class {} }));
vi.mock('react-i18next', () => ({ initReactI18next: {} }));

describe('i18n service', () => {
  beforeEach(async () => {
    vi.resetModules();
    await import('./i18n.service');
  });

  test('When initialised, then the language cookie has the Secure flag so it is never sent over HTTP', async () => {
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.detection.cookieOptions).toEqual(expect.objectContaining({ secure: true }));
  });

  test('When initialised, then the language cookie has SameSite=Strict to prevent cross-site leakage', async () => {
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.detection.cookieOptions).toEqual(expect.objectContaining({ sameSite: 'strict' }));
  });
});
