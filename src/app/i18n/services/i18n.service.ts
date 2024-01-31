import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import localStorageService from 'app/core/services/local-storage.service';
import envService from 'app/core/services/env.service';
import es from 'dayjs/locale/es';
import fr from 'dayjs/locale/fr';
import it from 'dayjs/locale/it';
import zh from 'dayjs/locale/zh-cn';
import ru from 'dayjs/locale/ru';
import de from 'dayjs/locale/de';
import en from 'dayjs/locale/en';
import dayjs from 'dayjs';

const dayJsLocale = {
  es,
  en,
  fr,
  it,
  zh,
  ru,
  de,
};

const deviceLang = localStorageService.get('language') || navigator.language.split('-')[0];

dayjs.locale(dayJsLocale[deviceLang] || 'en');

export default i18next
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: require('../locales/en.json'),
      },
      es: {
        translation: require('../locales/es.json'),
      },
      fr: {
        translation: require('../locales/fr.json'),
      },
      it: {
        translation: require('../locales/it.json'),
      },
      zh: {
        translation: require('../locales/zh.json'),
      },
      ru: {
        translation: require('../locales/ru.json'),
      },
      de: {
        translation: require('../locales/de.json'),
      },
    },
    debug: !envService.isProduction(),
    fallbackLng: 'en',
    // lng: deviceLang,
    detection: {
      order: ['querystring', 'cookie', 'navigator', 'localStorage'],
      caches: ['localStorage'],
    },
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });
