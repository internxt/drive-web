import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';
import { ReactNode, forwardRef } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import ItemsDropdown from './components/ItemsDropdown';
import { Theme, useThemeContext } from '../../../../../theme/ThemeProvider';

const appearances: Theme[] = ['system', 'light', 'dark'];

const MenuItem = forwardRef(({ children, onClick }: { children: ReactNode; onClick: () => void }) => {
  return (
    <div
      onKeyDown={() => {}}
      className={'flex h-full w-full cursor-pointer px-3 py-2 text-gray-80 hover:bg-gray-5 active:bg-gray-10'}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

const Appearance = () => {
  const { translate } = useTranslationContext();
  const { currentTheme, toggleTheme } = useThemeContext();

  return (
    <Section className="" title={translate('theme.title')}>
      <Card>
        <ItemsDropdown
          title={
            <div className="flex w-full flex-row justify-between">
              <p>{translate(`theme.${currentTheme}`)}</p>
              <CaretDown size={20} />
            </div>
          }
          menuItems={appearances.map((theme) => (
            <MenuItem
              key={theme}
              onClick={() => {
                toggleTheme(theme);
              }}
            >
              <p>{translate(`theme.${theme}`)}</p>
            </MenuItem>
          ))}
        />
      </Card>
    </Section>
  );
};

export default Appearance;
