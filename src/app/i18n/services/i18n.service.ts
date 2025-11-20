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

import localStorageService from 'services/local-storage.service';
import envService from 'services/env.service';

import enJson from '../locales/en.json';
import esJson from '../locales/es.json';
import frJson from '../locales/fr.json';
import itJson from '../locales/it.json';
import zhJson from '../locales/zh.json';
import ruJson from '../locales/ru.json';
import deJson from '../locales/de.json';
import twJson from '../locales/tw.json';

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
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enJson },
      es: { translation: esJson },
      fr: { translation: frJson },
      it: { translation: itJson },
      zh: { translation: zhJson },
      ru: { translation: ruJson },
      de: { translation: deJson },
      'zh-TW': { translation: twJson },
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
      escapeValue: false,
    },
  });
