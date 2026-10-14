import { Button } from '@internxt/ui';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import navigationService from 'services/navigation.service';

export const AccountAlreadyExistsMessage = (): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex flex-col space-y-5">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-medium text-gray-100">{translate('accountSetup.accountAlreadyExists.title')}</h1>
        <p className="text-base text-gray-60">{translate('accountSetup.accountAlreadyExists.description')}</p>
      </div>
      <Button variant="primary" className="w-full" onClick={() => navigationService.push(AppView.Login)}>
        {translate('accountSetup.accountAlreadyExists.loginButton')}
      </Button>
    </div>
  );
};
