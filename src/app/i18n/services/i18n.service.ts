import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

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
    defaultNS: 'translation',
    ns: ['translation'],
    debug: true,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export function get(value: string, object?: any): any {
  const { t } = useTranslation();
  const result = t(value, object);
  return result;
}

export default i18next;
