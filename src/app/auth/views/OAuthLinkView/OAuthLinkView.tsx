import { Button } from '@internxt/ui';
import authService from 'app/auth/services/auth.service';
import oauthService from 'app/auth/services/oauth.service';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import { useEffect, useMemo } from 'react';

const OAuthLinkView = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const user = useMemo(() => localStorageService.getUser(), []);

  const urlParams = new URLSearchParams(window.location.search);

  useEffect(() => {
    if (!user) {
      const params = urlParams.toString();
      navigationService.history.replace(`${AppView.Login}${params ? '?' + params : ''}`);
    }
  }, [user]);

  if (!user) return <></>;

  const handleGoToLogin = () => {
    const params: Record<string, string> = {};
    urlParams.forEach((value, key) => {
      params[key] = value;
    });
    authService.logOut(params);
  };

  const handleContinueWithCurrentUser = () => {
    const newToken = localStorageService.get('xNewToken');
    if (!newToken) {
      navigationService.history.replace(AppView.Login);
      return;
    }

    const success = oauthService.sendAuthSuccess(user, newToken);
    if (!success) {
      // If sending failed, show error or redirect to login
      navigationService.history.replace(AppView.Login);
    }
  };

  return (
    <main className="flex h-full w-full flex-col bg-gray-5 dark:bg-surface">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-gray-5 dark:bg-surface">
        <div className="w-96 rounded-lg px-8 py-10 shadow-soft dark:bg-gray-5">
          <div className="mb-6 flex justify-center">
            <InternxtLogo className="h-auto w-52 text-gray-100" />
          </div>
          <h2 className="text-center text-xl font-medium text-gray-100">{translate('auth.oauthLink.continueAs')}</h2>
          <h3
            title={user.email}
            className="over mb-6 overflow-x-hidden text-ellipsis text-center text-xl font-medium text-gray-60"
          >
            {user.email}
          </h3>
          <Button onClick={handleContinueWithCurrentUser} className="w-full">
            {translate('auth.oauthLink.continue')}
          </Button>
          <div className="separator my-6"></div>
          <div className="flex flex-row justify-center">
            <h4 className="text-base font-medium">{translate('auth.oauthLink.anotherAccount')}</h4>
            <button onClick={handleGoToLogin} className="ml-2.5 text-base font-medium no-underline">
              {translate('auth.oauthLink.login')}
            </button>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-row justify-center py-8">
        <a
          href="https://internxt.com/legal"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          {translate('general.terms')}
        </a>
        <a
          href="https://help.internxt.com"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          {translate('general.help')}
        </a>
      </div>
    </main>
  );
};

export default OAuthLinkView;
