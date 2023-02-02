import { initReactI18next } from 'react-i18next';
import i18next, { TFunctionDetailedResult } from 'i18next';
import { useTranslation } from 'react-i18next';
import localStorageService from 'app/core/services/local-storage.service';

const isProduction = process.env.NODE_ENV !== 'production';

let deviceLang = navigator.language.split('-')[0];

if (!localStorageService.get('language')) {
  localStorageService.set('language', deviceLang);
} else {
  deviceLang = localStorageService.get('language') as string;
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
    debug: isProduction ? false : true,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export function get(value: string, object?: Record<string, unknown>): string {
  const { t } = useTranslation();
  const result = t(value, object as TFunctionDetailedResult) as string;
  return result;
}
export default i18next;
