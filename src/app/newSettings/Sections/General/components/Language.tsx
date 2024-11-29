import { CaretDown } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import i18next from 'i18next';
import React, { useEffect } from 'react';
import localStorageService from '../../../../core/services/local-storage.service';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import Card from '../../../../shared/components/Card';
import ItemsDropdown from './ItemsDropdown';
import MenuItem from './MenuItem';
import Section from './Section';

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
      <Card className="w-fit py-3 dark:bg-gray-5">
        <ItemsDropdown
          title={
            <div className="flex flex-row items-center justify-between space-x-2">
              <p className="text-base font-medium leading-5">{translate(`lang.${lang}`)}</p>
              <CaretDown size={10} />
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
