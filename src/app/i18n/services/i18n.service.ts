// import _ from 'lodash';
// import format from 'string-template';
// import { Locale } from '../types';

// import locales from '../locales';

// class I18nService {
//   currentLocale: string = Locale.Spanish;

//   get(key: string, values = {}): string {
//     const messageTemplate = _.get(locales[this.currentLocale], key) || key;
//     const result = format(messageTemplate, values);

//     return result;
//   }
// }

// const i18n = new I18nService();

// export default i18n;

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';
import es from '../locales/es.json';
import en from '../locales/en.json';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    // (tip move them in a JSON file and import them,
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
    resources: {
      en: en,
      es: es,
    },
    lng: 'en', // if you're using a language detector, do not define the lng option
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  });
i18next.init({
  // lng: 'en', // if you're using a language detector, do not define the lng option
  fallbackLng: 'en',
  debug: true,
  resources: {
    en: en,
    es: es,
  },
});
