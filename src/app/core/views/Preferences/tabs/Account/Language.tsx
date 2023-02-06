import React, { forwardRef, ReactNode, useEffect } from 'react';
import i18next, { DefaultTFuncReturn } from 'i18next';
import Section from '../../components/Section';
import Card from 'app/shared/components/Card';
import { CaretDown } from 'phosphor-react';
import { Menu, Transition } from '@headlessui/react';
import localStorageService from 'app/core/services/local-storage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

function getLanguage(): string {
  const deviceLanguage = localStorageService.get('language') as string;
  return deviceLanguage;
}

const deviceLang = getLanguage();

export default function Language(): JSX.Element {
  const { translate } = useTranslationContext();
  const [lang, setLang] = React.useState<string>(deviceLang);
  const [currentLangText, setCurrentLangText] = React.useState<DefaultTFuncReturn>(
    deviceLang === 'en' ? 'English (US)' : 'Español (ES)',
  );

  useEffect(() => {
    localStorageService.set('language', lang);
  }, [lang]);

  const MenuItem = forwardRef(({ children, onClick }: { children: ReactNode; onClick: () => void }, ref) => {
    return (
      <div
        className="flex h-full w-full cursor-pointer py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
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
                  <div className="pt-2" key={'menuitem-' + index}>
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
                setCurrentLangText(translate('lang.en') as string);
              }}
            >
              <p>{translate('lang.en')}</p>
            </MenuItem>,
            <MenuItem
              onClick={() => {
                setLang('es');
                setCurrentLangText(translate('lang.es') as string);
              }}
            >
              <p>{translate('lang.es')}</p>
            </MenuItem>,
          ]}
        />
      </Card>
    </Section>
  );
}
