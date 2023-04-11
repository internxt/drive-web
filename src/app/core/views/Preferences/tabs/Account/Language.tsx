import React, { forwardRef, ReactNode, useEffect } from 'react';
import i18next, { DefaultTFuncReturn } from 'i18next';
import Section from '../../components/Section';
import Card from 'app/shared/components/Card';
import { CaretDown } from 'phosphor-react';
import { Menu, Transition } from '@headlessui/react';
import localStorageService from 'app/core/services/local-storage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import es from 'dayjs/locale/es';
import fr from 'dayjs/locale/fr';
import dayjs from 'dayjs';

const currentLang = {
  es: 'Español (ES)',
  fr: 'Français (FR)',
  en: 'English (EN)',
};

const localStorageLanguage = localStorageService.get('language');

export default function Language(): JSX.Element {
  const { translate } = useTranslationContext();
  const [lang, setLang] = React.useState<string>();
  const [currentLangText, setCurrentLangText] = React.useState<DefaultTFuncReturn>();

  function changeLang(lang: string = localStorageLanguage || i18next.language) {
    setCurrentLangText(currentLang[lang]);
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

  const MenuItem = forwardRef(({ children, onClick }: { children: ReactNode; onClick: () => void }, _ref) => {
    return (
      <div
        className={'flex h-full w-full cursor-pointer py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10'}
        onClick={onClick}
      >
        {children}
      </div>
    );
  });

  function LangDropdown({ title, menuItems }: { title: JSX.Element; menuItems: ReactNode[] }) {
    return (
      <Menu>
        <Menu.Button className={'flex h-full w-full rounded-lg text-base transition-all duration-75 ease-in-out'}>
          {title}
        </Menu.Button>
        <Transition
          className={'left-0'}
          enter="transform transition duration-50 ease-out"
          enterFrom="scale-98 opacity-0"
          enterTo="scale-100 opacity-100"
          leave="transform transition duration-50 ease-out"
          leaveFrom="scale-98 opacity-100"
          leaveTo="scale-100 opacity-0"
        >
          <Menu.Items className={'mt-2 w-full rounded-md bg-white py-1.5 drop-shadow'}>
            {menuItems && (
              <div className="border-translate w-full border-gray-10">
                {menuItems?.map((item, index) => (
                  <div className={'pt-2'} key={'menuitem-' + index}>
                    <Menu.Item>{item}</Menu.Item>
                  </div>
                ))}
              </div>
            )}
          </Menu.Items>
        </Transition>
      </Menu>
    );
  }

  return (
    <Section className="" title={translate('lang.title')}>
      <Card>
        <LangDropdown
          title={
            <div className="flex w-full flex-row justify-between">
              <p>{currentLangText}</p>
              <CaretDown size={20} />
            </div>
          }
          menuItems={[
            <MenuItem
              onClick={() => {
                setLang('en');
                i18next.changeLanguage('en');
                setCurrentLangText(translate('lang.en') as string);
                dayjs.locale('en');
              }}
            >
              <p>{translate('lang.en')}</p>
            </MenuItem>,
            <MenuItem
              onClick={() => {
                setLang('es');
                i18next.changeLanguage('es');
                setCurrentLangText(translate('lang.es') as string);
                dayjs.locale(es);
              }}
            >
              <p>{translate('lang.es')}</p>
            </MenuItem>,
            <MenuItem
              onClick={() => {
                setLang('fr');
                i18next.changeLanguage('fr');
                setCurrentLangText(translate('lang.fr') as string);
                dayjs.locale(fr);
              }}
            >
              <p>{translate('lang.fr')}</p>
            </MenuItem>,
          ]}
        />
      </Card>
    </Section>
  );
}
