import { CaretDown } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { isStarWarsThemeAvailable } from 'app/payment/utils/checkStarWarsCode';
import { RootState } from 'app/store';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Card from '../../../../../shared/components/Card';
import { Theme, useThemeContext } from '../../../../../theme/ThemeProvider';
import Section from '../../components/Section';
import ItemsDropdown from './components/ItemsDropdown';
import MenuItem from './components/MenuItem';

const initialAppearances: Theme[] = ['system', 'light', 'dark'];

const Appearance = () => {
  const plan = useSelector((state: RootState) => state.plan);

  const { translate } = useTranslationContext();
  const { currentTheme, toggleTheme } = useThemeContext();
  const [appearances, setAppearances] = useState<Theme[]>(initialAppearances);

  useEffect(() => {
    isStarWarsThemeAvailable(plan)
      .then((isStarWarsThemeAvailable) => {
        if (!appearances.includes('starwars') && isStarWarsThemeAvailable) {
          setAppearances([...appearances, 'starwars']);
        }
      })
      .catch((err) => {
        const error = err as Error;
        console.error(error.message);
      });
  }, []);

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
