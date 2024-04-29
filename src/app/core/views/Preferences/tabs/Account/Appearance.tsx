import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';
import { CaretDown } from '@phosphor-icons/react';
import ItemsDropdown from './components/ItemsDropdown';
import { Theme, useThemeContext } from '../../../../../theme/ThemeProvider';
import MenuItem from './components/MenuItem';
import { useEffect } from 'react';
import paymentService from '../../../../../payment/services/payment.service';

const STAR_WARS_COUPON_NAME = 'Star Wars';

const appearances: Theme[] = ['system', 'light', 'dark'];

const Appearance = () => {
  const { translate } = useTranslationContext();
  const { currentTheme, toggleTheme } = useThemeContext();

  useEffect(() => {
    paymentService
      .isCouponUsedByUser(STAR_WARS_COUPON_NAME)
      .then((isCouponUsed) => {
        if (isCouponUsed && !appearances.some((theme) => theme === 'Star Wars')) {
          appearances.push('Star Wars');
        }
      })
      .catch((err) => {
        // NO OP
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
