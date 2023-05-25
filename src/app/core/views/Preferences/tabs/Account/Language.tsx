import React, { forwardRef, ReactNode, useEffect } from 'react';
import i18next, { DefaultTFuncReturn, t } from 'i18next';
import Section from '../../components/Section';
import Card from 'app/shared/components/Card';
import { CaretDown } from 'phosphor-react';
import { Menu, Transition } from '@headlessui/react';
import localStorageService from 'app/core/services/local-storage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import es from 'dayjs/locale/es';
import fr from 'dayjs/locale/fr';
import it from 'dayjs/locale/it';
import ru from 'dayjs/locale/ru';
import dayjs from 'dayjs';
import cn from 'dayjs/locale/zh-cn';

const localStorageLanguage = localStorageService.get('language');

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

  return (
    <Section className="" title={translate('lang.title')}>
      <Card>
        <LangDropdown
          title={
            <div className="flex w-full flex-row justify-between">
              <p>{translate(`lang.${lang}`)}</p>
              <CaretDown size={20} />
            </div>
          }
          menuItems={[
            <MenuItem
              key={'en'}
              onClick={() => {
                setLang('en');
                i18next.changeLanguage('en');
                dayjs.locale('en');
              }}
            >
              <p>{translate('lang.en')}</p>
            </MenuItem>,
            <MenuItem
              key={'es'}
              onClick={() => {
                setLang('es');
                i18next.changeLanguage('es');
                dayjs.locale(es);
              }}
            >
              <p>{translate('lang.es')}</p>
            </MenuItem>,
            <MenuItem
              key={'fr'}
              onClick={() => {
                setLang('fr');
                i18next.changeLanguage('fr');
                dayjs.locale(fr);
              }}
            >
              <p>{translate('lang.fr')}</p>
            </MenuItem>,
            <MenuItem
              key={'it'}
              onClick={() => {
                setLang('it');
                i18next.changeLanguage('it');
                dayjs.locale(it);
              }}
            >
              <p>{translate('lang.it')}</p>
            </MenuItem>,
            <MenuItem
              key={'cn'}
              onClick={() => {
                setLang('cn');
                i18next.changeLanguage('cn');
                dayjs.locale(cn);
              }}
            >
              <p>{translate('lang.cn')}</p>
            </MenuItem>,
            <MenuItem
              key={'ru'}
              onClick={() => {
                setLang('ru');
                i18next.changeLanguage('ru');
                dayjs.locale(ru);
              }}
            >
              <p>{translate('lang.ru')}</p>
            </MenuItem>,
          ]}
        />
      </Card>
    </Section>
  );
}
