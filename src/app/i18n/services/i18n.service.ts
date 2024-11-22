import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import dayjs from 'dayjs';
import es from 'dayjs/locale/es';
import fr from 'dayjs/locale/fr';
import it from 'dayjs/locale/it';
import zh from 'dayjs/locale/zh';
import ru from 'dayjs/locale/ru';
import de from 'dayjs/locale/de';
import en from 'dayjs/locale/en';
import tw from 'dayjs/locale/zh-tw';

import translation_en from '../locales/en.json';
import translation_es from '../locales/es.json';
import translation_fr from '../locales/fr.json';
import translation_it from '../locales/it.json';
import translation_zh from '../locales/zh.json';
import translation_ru from '../locales/ru.json';
import translation_de from '../locales/de.json';
import translation_tw from '../locales/tw.json';

import localStorageService from 'app/core/services/local-storage.service';
import envService from 'app/core/services/env.service';

const dayJsLocale = {
  es,
  en,
  fr,
  it,
  zh,
  ru,
  de,
  tw,
};

const deviceLang = localStorageService.get('i18nextLng') ?? navigator.language.split('-')[0];

dayjs.locale(dayJsLocale[deviceLang] || 'en');

export default i18next
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: translation_en,
      },
      es: {
        translation: translation_es,
      },
      fr: {
        translation: translation_fr,
      },
      it: {
        translation: translation_it,
      },
      zh: {
        translation: translation_zh,
      },
      ru: {
        translation: translation_ru,
      },
      de: {
        translation: translation_de,
      },
      'zh-TW': {
        translation: translation_tw,
      },
    },
    debug: !envService.isProduction(),
    fallbackLng: 'en',
    detection: {
      order: ['querystring', 'localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });
