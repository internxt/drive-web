import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import { useThemeContext } from '../../../../theme/ThemeProvider';
import Section from './Section';

import appearance_dark from 'assets/dark.svg';
import appearance_light from 'assets/light.svg';
import appearance_system from 'assets/system.svg';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import errorService from '../../../../core/services/error.service';
import { isStarWarsThemeAvailable } from '../../../../payment/utils/checkStarWarsCode';
import { isHalloweenThemeAvailable } from '../../../../payment/utils/checkHalloweenCode';
import { isChristmasThemeAvailable } from '../../../../payment/utils/checkChristmasCode';
import { isSuperbowlThemeAvailable } from '../../../../payment/utils/checkSuperBowlCode';
import { iStPatricksThemeAvailable } from '../../../../payment/utils/checkStPatrciksCode';
import { RootState } from '../../../../store';

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
  const plan = useSelector((state: RootState) => state.plan);

  const [appearances, setAppearances] = useState(themes);

  // CHECK IF THIS WORKS BEFORE MERGE
  useEffect(() => {
    function isAppearanceExist(prevAppearances, theme, img) {
      return prevAppearances.some((appearance) => appearance.theme === theme && appearance.img === img);
    }

    function addAppearanceIfUnique(prevAppearances, theme, img) {
      if (isAppearanceExist(prevAppearances, theme, img)) {
        return prevAppearances;
      }
      return [...prevAppearances, { theme, img }];
    }

    const updateAppearance = (theme, img) => {
      setAppearances((prevAppearances) => addAppearanceIfUnique(prevAppearances, theme, img));
    };

    isStarWarsThemeAvailable(plan)
      .then((isStarWarsThemeAvailable) => {
        if (isStarWarsThemeAvailable) {
          updateAppearance('starwars', appearance_dark);
        }
      })
      .catch((err) => {
        const error = err as Error;
        errorService.reportError(error);
      });

    isHalloweenThemeAvailable(plan)
      .then((isHalloweenThemeAvailable) => {
        if (isHalloweenThemeAvailable) {
          updateAppearance('halloween', appearance_dark);
        }
      })
      .catch((err) => {
        const error = err as Error;
        errorService.reportError(error);
      });

    isChristmasThemeAvailable(plan)
      .then((isChristmasThemeAvailable) => {
        if (isChristmasThemeAvailable) {
          updateAppearance('christmas', appearance_dark);
        }
      })
      .catch((err) => {
        const error = err as Error;
        errorService.reportError(error);
      });

    isSuperbowlThemeAvailable(plan)
      .then((isSuperbowlThemeAvailable) => {
        if (isSuperbowlThemeAvailable) {
          updateAppearance('superbowl', appearance_dark);
        }
      })
      .catch((err) => {
        const error = err as Error;
        errorService.reportError(error);
      });

    iStPatricksThemeAvailable(plan)
      .then((iStPatricksThemeAvailable) => {
        if (iStPatricksThemeAvailable) {
          updateAppearance('stpatricks', appearance_dark);
        }
      })
      .catch((err) => {
        const error = err as Error;
        errorService.reportError(error);
      });
  }, []);

  return (
    <Section className="" title={translate('theme.title')}>
      <div className="flex flex-row">
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
    </Section>
  );
};

export default Appearance;
