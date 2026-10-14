import { CaretDown } from '@phosphor-icons/react';
import i18next from 'i18next';
import React from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ItemsDropdown from './ItemsDropdown';
import MenuItem from './MenuItem';
import Section from './Section';
import { Card } from '@internxt/ui';

const languages = ['en', 'es', 'fr', 'it', 'zh', 'ru', 'de', 'zh-tw', 'pt-br'];

export default function Language(): JSX.Element {
  const { translate } = useTranslationContext();
  const [lang, setLang] = React.useState<string>(() =>
    (i18next.resolvedLanguage ?? i18next.language ?? 'en').toLowerCase(),
  );

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
