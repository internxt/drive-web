import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import { useThemeContext } from '../../../../theme/ThemeProvider';
import Section from './Section';

import appearance_dark from 'assets/dark.svg';
import appearance_light from 'assets/light.svg';
import appearance_system from 'assets/system.svg';
import { useEffect, useState } from 'react';
import paymentService from 'app/payment/services/payment.service';
import { AvailableThemesService } from 'app/theme/availableThemes.service';
import errorService from 'app/core/services/error.service';

function ThemeButton({ theme, toggleTheme, isSelected, img }) {
  const { translate } = useTranslationContext();

  return (
    <button
      className={'mr-4 flex w-36 flex-col space-y-1 rounded-xl'}
      onClick={() => {
        toggleTheme(theme);
      }}
    >
      <div
        className={`box-border overflow-hidden rounded-xl ${
          isSelected
            ? 'border-2 border-primary outline outline-4 outline-primary/10 drop-shadow'
            : 'border-2 border-transparent'
        }`}
      >
        <img src={img} alt={theme} />
      </div>

      <span className={`text-sm font-medium ${!isSelected ? 'text-gray-50' : ''}`}>{translate(`theme.${theme}`)}</span>
    </button>
  );
}
const themes = [
  { theme: 'system', img: appearance_system },
  { theme: 'light', img: appearance_light },
  { theme: 'dark', img: appearance_dark },
];

const Appearance = () => {
  const { translate } = useTranslationContext();
  const { currentTheme, toggleTheme } = useThemeContext();

  const [appearances, setAppearances] = useState(themes);

  useEffect(() => {
    fetchUserThemes();
  }, []);

  const fetchUserThemes = async () => {
    try {
      const { usedCoupons: userPromoCodes } = await paymentService.getPromoCodesUsedByUser();
      const availableThemesService = new AvailableThemesService(userPromoCodes);

      const allAvailableThemesForUSer = await availableThemesService.getAllAvailableThemes();
      const newAppearances = allAvailableThemesForUSer.map((theme) => ({
        theme,
        img: appearance_dark,
      }));

      setAppearances((prev) => {
        const filteredNew = newAppearances.filter(
          (newAppearance) => !prev.some((appearance) => appearance.theme === newAppearance.theme),
        );
        return [...prev, ...filteredNew];
      });
    } catch (error) {
      console.error(`Something went wrong while fetching available themes for user. ERROR: ${error}`);
      errorService.reportError(error);
    }
  };

  return (
    <Section title={translate('theme.title')}>
      <div className="flex flex-col w-full h-max overflow-x-auto">
        <div className="flex flex-row w-max h-max pb-2">
          {appearances.map((themeInfo) => (
            <ThemeButton
              key={themeInfo.theme}
              theme={themeInfo.theme}
              toggleTheme={toggleTheme}
              isSelected={currentTheme === themeInfo.theme}
              img={themeInfo.img}
            />
          ))}
        </div>
      </div>
    </Section>
  );
};

export default Appearance;
