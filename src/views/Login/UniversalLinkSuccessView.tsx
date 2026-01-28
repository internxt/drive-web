import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Button } from '@internxt/ui';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import { useEffect, useMemo } from 'react';
import authService from 'services/auth.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';

const DEEPLINK_SUCCESS_REDIRECT_BASE = 'internxt://login-success';

export default function UniversalLinkView(): JSX.Element {
  const { translate } = useTranslationContext();
  const user = useMemo(() => localStorageService.getUser(), []);

  const urlParams = new URLSearchParams(globalThis.location.search);
  const redirectUri = urlParams.get('redirectUri');

  useEffect(() => {
    if (!user) {
      const params = urlParams.toString();
      navigationService.history.replace(`${AppView.Login}${params ? '?' + params : ''}`);
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

  const handleGoToUniversalLinkUrl = () => {
    globalThis.location.href = getUniversalLinkAuthUrl(user);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-login-gradient">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-[#CCCCCC80] bg-[#FAFAFA40] px-8 py-10 dark:border-[#FFFFFF1A] dark:bg-[#FFFFFF0D] sm:bg-surface sm:shadow-subtle sm:dark:bg-gray-5">
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-medium">{translate('auth.universalLink.loginAs')}</h1>
            <p
              title={user.email}
              className="overflow-x-hidden text-ellipsis text-center text-xl font-medium text-gray-60 mt-2"
            >
              {user.email}
            </p>

            {/* Universal links needs to be clicked in order to work, JS window.open does not work */}
            <Button onClick={handleGoToUniversalLinkUrl} className="w-full mt-5">
              {translate('auth.universalLink.openApp')}
            </Button>

            <div className="w-full separator my-6" />

            <p className="w-full text-center">{translate('auth.universalLink.anotherAccount')}</p>
            <Button
              variant="secondary"
              onClick={handleGoToLogin}
              className="w-full mt-3 !border-highlight/10 !bg-white/15 !shadow-sm hover:!bg-white/25 dark:!border-white/10"
            >
              {translate('auth.universalLink.login')}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center space-x-0 space-y-2 py-8 sm:flex-row sm:space-x-8 sm:space-y-0">
        <a href="https://internxt.com/legal" target="_blank" rel="noopener noreferrer" className="auth-footer-link">
          {translate('general.terms')}
        </a>
        <a href="https://help.internxt.com" target="_blank" rel="noopener noreferrer" className="auth-footer-link">
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
}
