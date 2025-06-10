import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';

interface HeaderComponentProps {
  isUserAuthenticated: boolean;
}

export const HeaderComponent = ({ isUserAuthenticated }: HeaderComponentProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const onInxtLogoClicked = () => {
    if (isUserAuthenticated) {
      navigationService.push(AppView.Drive);
    } else {
      navigationService.push(AppView.Signup);
    }
  };

  return (
    <div className="flex w-full flex-row justify-between">
      <div className="flex flex-row space-x-2">
        <InternxtLogo className="h-auto w-28 cursor-pointer text-gray-100" onClick={onInxtLogoClicked} />
        <p className="text-lg text-gray-70">{translate('checkout.checkout')}</p>
      </div>
    </div>
  );
};
