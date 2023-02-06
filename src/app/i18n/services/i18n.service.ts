import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';

const deviceLang = navigator.language.split('-')[0];

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
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
    debug: isProduction() ? false : true,
    fallbackLng: 'en',
    lng: deviceLang,
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18next;
