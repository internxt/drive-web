import deTranslations from 'app/i18n/locales/de.json';
import enTranslations from 'app/i18n/locales/en.json';
import esTranslations from 'app/i18n/locales/es.json';
import frTranslations from 'app/i18n/locales/fr.json';
import itTranslations from 'app/i18n/locales/it.json';
import ruTranslations from 'app/i18n/locales/ru.json';
import twTranslations from 'app/i18n/locales/tw.json';
import zhTranslations from 'app/i18n/locales/zh.json';
import { describe, expect, it } from 'vitest';

type TranslationNode = { [key: string]: string | TranslationNode };

const asTranslationNode = (translations: object): TranslationNode => translations as TranslationNode;

const ENGLISH = asTranslationNode(enTranslations);

const LOCALES: Record<string, TranslationNode> = {
  es: asTranslationNode(esTranslations),
  fr: asTranslationNode(frTranslations),
  it: asTranslationNode(itTranslations),
  de: asTranslationNode(deTranslations),
  ru: asTranslationNode(ruTranslations),
  zh: asTranslationNode(zhTranslations),
  tw: asTranslationNode(twTranslations),
};

const getBfCheckoutNode = (translations: TranslationNode): TranslationNode =>
  (translations.checkout as TranslationNode).bfCheckout as TranslationNode;

const flatten = (node: TranslationNode, prefix = ''): string[] =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return typeof value === 'string' ? [path] : flatten(value, path);
  });

const getBfCheckoutKeys = (translations: TranslationNode): string[] => flatten(getBfCheckoutNode(translations)).sort();

const getBfCheckoutValue = (translations: TranslationNode, path: string): string => {
  const value = path
    .split('.')
    .reduce<string | TranslationNode>((node, part) => (node as TranslationNode)[part], getBfCheckoutNode(translations));

  return typeof value === 'string' ? value : '';
};

const getPlaceholders = (value: string): string[] => (value.match(/{{\w+}}/g) ?? []).sort();

describe('BF checkout translations', () => {
  const englishKeys = getBfCheckoutKeys(ENGLISH);

  it.each(Object.keys(LOCALES))('When %s is loaded, then it has the same BF checkout keys as English', (locale) => {
    expect(getBfCheckoutKeys(LOCALES[locale])).toEqual(englishKeys);
  });

  it.each(Object.keys(LOCALES))('When %s is loaded, then every interpolation is kept', (locale) => {
    englishKeys.forEach((key) => {
      const translated = getBfCheckoutValue(LOCALES[locale], key);

      expect(translated.length, `${locale} → ${key} is empty`).toBeGreaterThan(0);
      expect(getPlaceholders(translated), `${locale} → ${key}`).toEqual(
        getPlaceholders(getBfCheckoutValue(ENGLISH, key)),
      );
    });
  });
});
