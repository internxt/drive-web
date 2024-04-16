import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import Section from '../../../../core/views/Preferences/components/Section';
import { useThemeContext } from '../../../../theme/ThemeProvider';

import appearance_dark from 'assets/dark.svg';
import appearance_light from 'assets/light.svg';
import appearance_system from 'assets/system.svg';

function ThemeButton({ theme, toggleTheme, isSelected, img }) {
  const { translate } = useTranslationContext();

  return (
    <button
      className={'mr-4 flex w-36 flex-col rounded-xl'}
      onClick={() => {
        toggleTheme(theme);
      }}
    >
      <div
        className={`box-border rounded-xl ${
          isSelected ? 'border-2 border-primary drop-shadow' : 'border-2 border-transparent'
        }`}
      >
        <img className="rounded-xl" src={img} alt={theme} />
      </div>

      <span className={`${!isSelected ? 'text-gray-50' : ''}`}>{translate(`theme.${theme}`)}</span>
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

  return (
    <Section className="" title={translate('theme.title')}>
      <div className="flex flex-row">
        {themes.map((themeInfo) => (
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
