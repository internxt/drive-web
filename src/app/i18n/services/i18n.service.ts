import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import localStorageService from 'app/core/services/local-storage.service';
import envService from 'app/core/services/env.service';
import es from 'dayjs/locale/es';
import fr from 'dayjs/locale/fr';
import it from 'dayjs/locale/it';
import cn from 'dayjs/locale/zh-cn';
import ru from 'dayjs/locale/ru';
import de from 'dayjs/locale/de';
import dayjs from 'dayjs';

const dayJsLocale = {
  es,
  fr,
  it,
  cn,
  ru,
  de,
};

const deviceLang = localStorageService.get('language') || navigator.language.split('-')[0];

dayjs.locale(dayJsLocale[deviceLang] || 'en');

i18next
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
      cn: {
        translation: require('../locales/cn.json'),
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
    lng: deviceLang,
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18next;
