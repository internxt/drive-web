import React, { useEffect } from 'react';
import i18next from 'i18next';
import Section from '../../components/Section';
import Card from 'app/shared/components/Card';
import { CaretDown } from '@phosphor-icons/react';
import localStorageService from 'app/core/services/local-storage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import dayjs from 'dayjs';
import ItemsDropdown from './components/ItemsDropdown';
import MenuItem from './components/MenuItem';

const localStorageLanguage = localStorageService.get('language');

const languages = ['en', 'es', 'fr', 'it', 'cn', 'ru', 'de'];

export default function Language(): JSX.Element {
  const { translate } = useTranslationContext();
  const [lang, setLang] = React.useState<string>();

  function changeLang(lang: string = localStorageLanguage || i18next.language) {
    setLang(lang);
  }

  useEffect(() => {
    if (localStorageLanguage) {
      changeLang(localStorageLanguage);
    } else {
      changeLang(i18next.language);
    }
  }, []);

  useEffect(() => {
    localStorageService.set('language', lang as string);
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
