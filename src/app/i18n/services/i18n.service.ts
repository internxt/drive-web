import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

i18next
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    // (tip move them in a JSON file and import them,
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
    resources: {
      en: {
        translation: require('../locales/en.json'),
      },
      es: {
        translation: require('../locales/es.json'),
      },
    },
    lng: 'es', // if you're using a language detector, do not define the lng option
    fallbackLng: 'en',
    defaultNS: 'translation',
    debug: true,
  });

export function get(value: string, object?: any): any {
  const { t } = useTranslation();
  const result = t(value, object);
  return result;
}

export default i18next;
