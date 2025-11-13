import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Button } from '@internxt/ui';
import authService from 'app/auth/services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import { useEffect, useMemo } from 'react';

const DEEPLINK_SUCCESS_REDIRECT_BASE = 'internxt://login-success';

export default function UniversalLinkView(): JSX.Element {
  const { translate } = useTranslationContext();
  const user = useMemo(() => localStorageService.getUser(), []);

  const urlParams = new URLSearchParams(window.location.search);
  const redirectUri = urlParams.get('redirectUri');

  useEffect(() => {
    if (!user) {
      navigationService.history.replace(`${AppView.Login}?${urlParams.toString()}`);
    }
  }, [user]);

  const getUniversalLinkAuthUrl = (user: UserSettings) => {
    const token = localStorageService.get('xToken');
    const newToken = localStorageService.get('xNewToken');
    if (!token) return AppView.Login;
    if (!newToken) return AppView.Login;

    let baseURL = DEEPLINK_SUCCESS_REDIRECT_BASE;
    if (redirectUri) {
      baseURL = Buffer.from(redirectUri, 'base64').toString();
    }

    return `${baseURL}?mnemonic=${btoa(user.mnemonic)}&token=${btoa(token)}&newToken=${btoa(
      newToken,
    )}&privateKey=${btoa(user.privateKey)}`;
  };

  // Should redirect to login in the useEffect
  if (!user) return <></>;

  const handleGoToLogin = () => {
    authService.logOut();
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
          <h2 className="text-center text-xl font-medium text-gray-100">
            {translate('auth.universalLinkSuccess.loginAs')}
          </h2>
          <h3
            title={user.email}
            className="over mb-6 overflow-x-hidden text-ellipsis text-center text-xl font-medium text-gray-60"
          >
            {user.email}
          </h3>
          {/* Universal links needs to be clicked in order to work, JS window.open does not work */}
          <a href={getUniversalLinkAuthUrl(user)}>
            <Button className="w-full">{translate('auth.universalLinkSuccess.openApp')}</Button>
          </a>
          <div className="separator my-6"></div>
          <div className="flex flex-row justify-center">
            <h4 className="text-base font-medium">{translate('auth.universalLinkSuccess.anotherAccount')}</h4>
            <button onClick={handleGoToLogin} className="ml-2.5 text-base font-medium no-underline">
              {translate('auth.universalLinkSuccess.login')}
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
}
