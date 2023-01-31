import Dropdown from 'react-bootstrap/Dropdown';
import React from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

export default function Language(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div>
      <Dropdown>
        <Dropdown.Item
          onClick={() => {
            i18next.changeLanguage('en');
          }}
        >
          {t('lang.en')}
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => {
            i18next.changeLanguage('es');
          }}
        >
          {t('lang.es')}
        </Dropdown.Item>
      </Dropdown>
    </div>
  );
}
