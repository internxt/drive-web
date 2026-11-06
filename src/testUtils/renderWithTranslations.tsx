import { ReactElement } from 'react';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { render } from '@testing-library/react';
import { TranslationProvider } from 'app/i18n/provider/TranslationProvider';
import enJson from 'app/i18n/locales/en.json';
import esJson from 'app/i18n/locales/es.json';

/**
 * Renders the UI in English with an isolated i18next instance holding the real English and Spanish
 * locales, so a test can call `i18n.changeLanguage('es')` and check that the mounted UI follows.
 */
export const renderWithTranslations = (ui: ReactElement) => {
  const i18n = i18next.createInstance();
  i18n.init({
    lng: 'en',
    resources: { en: { translation: enJson }, es: { translation: esJson } },
    initImmediate: false,
  });

  const renderResult = render(
    <I18nextProvider i18n={i18n}>
      <TranslationProvider>{ui}</TranslationProvider>
    </I18nextProvider>,
  );

  return { i18n, ...renderResult };
};
