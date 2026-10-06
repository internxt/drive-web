import { describe, expect, test } from 'vitest';
import { Locale } from '../types';
import locales from './index';

describe('locales', () => {
  test.each(Object.values(Locale))(
    'When the language is %s, then it has its translations and its own name for the language selector',
    (locale) => {
      const translations = locales[locale];

      expect(translations).toBeDefined();
      expect(translations.lang[locale]).toEqual(expect.any(String));
      expect(translations.lang[locale]).not.toBe('');
    },
  );
});
