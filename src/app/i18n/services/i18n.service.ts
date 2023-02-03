import { initReactI18next } from 'react-i18next';
import i18next, { TFunctionDetailedResult } from 'i18next';
import { useTranslation } from 'react-i18next';
import localStorageService from 'app/core/services/local-storage.service';

let deviceLang = navigator.language.split('-')[0];

if (localStorageService.get('language')) {
  deviceLang = localStorageService.get('language') as string;
} else {
  localStorageService.set('language', deviceLang);
}

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
    },
    fallbackLng: 'en',
    lng: deviceLang,
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18next;
