import Dropdown from 'app/shared/components/Dropdown';
import React, { forwardRef, ReactNode } from 'react';
import i18next, { DefaultTFuncReturn } from 'i18next';
import { useTranslation } from 'react-i18next';
import Section from '../../components/Section';
import Card from 'app/shared/components/Card';
import { CaretDown } from 'phosphor-react';
import { Menu, Transition } from '@headlessui/react';

export default function Language(): JSX.Element {
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = React.useState<DefaultTFuncReturn>(t('lang.en'));
  const MenuItem = forwardRef(({ children, onClick }: { children: ReactNode; onClick: () => void }) => {
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
              <div className="w-full">
                {menuItems?.map((item, index) => (
                  <Menu.Item key={'menuitem-' + index}>{item}</Menu.Item>
                ))}
              </div>
            )}
          </Menu.Items>
        </Transition>
      </Menu>
    );
  }

  return (
    <Section className="" title={t('lang.title')}>
      <Card>
        <LangDropdown
          title={
            <div className="flex w-full flex-row justify-between">
              <p>{currentLang}</p>
              <CaretDown size={20} />
            </div>
          }
          menuItems={[
            <MenuItem
              onClick={() => {
                i18next.changeLanguage('en');
                setCurrentLang(t('lang.en'));
              }}
            >
              <p>{t('lang.en')}</p>
            </MenuItem>,
            <MenuItem
              onClick={() => {
                i18next.changeLanguage('es');
                setCurrentLang(t('lang.es'));
              }}
            >
              <p>{t('lang.es')}</p>
            </MenuItem>,
          ]}
        />
      </Card>
    </Section>
  );
}
