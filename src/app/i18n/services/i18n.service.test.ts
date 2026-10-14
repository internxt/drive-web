import { beforeEach, describe, expect, test, vi } from 'vitest';
import dayjs from 'dayjs';

const mockInit = vi.fn().mockResolvedValue(undefined);
const mockUse = vi.fn().mockReturnThis();
const mockOn = vi.fn();

vi.mock('i18next', () => ({
  default: { use: mockUse, init: mockInit, on: mockOn },
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

  test.each([
    ['es-ES', 'es'],
    ['en-US', 'en'],
    ['pt-PT', 'pt-BR'],
    ['pt-br', 'pt-BR'],
    ['zh-CN', 'zh'],
    ['zh-tw', 'zh-TW'],
    ['ja-JP', 'en'],
  ])(
    'When the detected language is %s, then it is normalised to the supported language %s',
    async (detected, expected) => {
      const initConfig = mockInit.mock.calls[0][0];
      const { default: actualI18next } = await vi.importActual<typeof import('i18next')>('i18next');
      const fakeDetector = { type: 'languageDetector' as const, detect: () => [detected] };
      const i18n = actualI18next.createInstance();

      await i18n.use(fakeDetector).init({ ...initConfig, debug: false });

      expect(i18n.language).toBe(expected);
    },
  );

  test('When the language changes, then dayjs uses the same language', () => {
    const onLanguageChanged = mockOn.mock.calls.find(([event]) => event === 'languageChanged')?.[1];

    onLanguageChanged('pt-BR');
    expect(dayjs.locale()).toBe('pt-br');

    onLanguageChanged('es');
    expect(dayjs.locale()).toBe('es');
  });

  test('When the language has no dayjs locale, then dayjs falls back to English', () => {
    const onLanguageChanged = mockOn.mock.calls.find(([event]) => event === 'languageChanged')?.[1];

    onLanguageChanged('es');
    onLanguageChanged('ja');

    expect(dayjs.locale()).toBe('en');
  });
});
