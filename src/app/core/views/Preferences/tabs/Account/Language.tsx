import { CaretDown } from '@phosphor-icons/react';
import localStorageService from 'app/core/services/local-storage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Card from 'app/shared/components/Card';
import i18next from 'i18next';
import React, { useEffect } from 'react';
import Section from '../../components/Section';

import dayjs from 'dayjs';
import ItemsDropdown from './components/ItemsDropdown';
import MenuItem from './components/MenuItem';

const localStorageLanguage = localStorageService.get('i18nextLng');

const languages = ['en', 'es', 'fr', 'it', 'zh', 'ru', 'de', 'zh-tw'];

const sanitizeLanguage = (language: string): string => {
  return language.toLowerCase().includes('en') ? 'en' : language;
};

export default function Language(): JSX.Element {
  const { translate } = useTranslationContext();
  const [lang, setLang] = React.useState<string>();

  function changeLang(lang: string = localStorageLanguage ?? i18next.language) {
    const sanitizedLang = sanitizeLanguage(lang);
    setLang(sanitizedLang);
    i18next.changeLanguage(sanitizedLang);
    dayjs.locale(sanitizedLang);
  }

  useEffect(() => {
    if (localStorageLanguage) {
      changeLang(localStorageLanguage);
    } else {
      changeLang(i18next.language);
    }
  }, []);

  useEffect(() => {
    changeLang(i18next.language);
  }, [lang]);
  return (
    <Section className="" title={translate('lang.title')}>
      <Card>
        <ItemsDropdown
          title={
            <div className="flex w-full flex-row justify-between">
              <p>{translate(`lang.${lang}`)}</p>
              <CaretDown size={20} />
            </div>
          }
          menuItems={languages.map((lang) => (
            <MenuItem
              key={lang}
              onClick={() => {
                setLang(lang);
                i18next.changeLanguage(lang);
                dayjs.locale(lang);
              }}
            >
              <p>{translate(`lang.${lang}`)}</p>
            </MenuItem>
          ))}
        />
      </Card>
    </Section>
  );
}
