import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';

export const HeaderComponent = () => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex w-full flex-row justify-between">
      <div className="flex flex-row space-x-2">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
        <p className="text-lg text-gray-70">{translate('checkout.checkout')}</p>
      </div>
    </div>
  );
};
