import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Button } from '@internxt/ui';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useAppDispatch } from 'app/store/hooks';
import { userThunks } from 'app/store/slices/user';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import AnimatedBackground from 'components/AnimatedBackground';
import { isMobile } from 'react-device-detect';
import { useEffect, useState } from 'react';
import navigationService from 'services/navigation.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import { TRUSTED_LOCALHOST_HOSTNAMES, TRUSTED_LOCALHOST_PROTOCOLS, validateUrl } from 'utils/urlValidation';

const DEEPLINK_SUCCESS_REDIRECT_BASE = 'internxt://login-success';

export default function UniversalLinkView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<UserSettings | null>(null);

  useEffect(() => {
    encryptedStorageService.getUser().then(setUser);
  }, []);

  const urlParams = new URLSearchParams(globalThis.location.search);
  const redirectUri = urlParams.get('redirectUri');

  useEffect(() => {
    if (!user) {
      const params = urlParams.toString();
      navigationService.history.replace(`${AppView.Login}${params ? '?' + params : ''}`);
    }
  }, [user]);

  const getUniversalLinkAuthUrl = (user: UserSettings): string | null => {
    const newToken = encryptedStorageService.getToken();
    if (!newToken) return AppView.Login;

    let baseURL = DEEPLINK_SUCCESS_REDIRECT_BASE;
    if (redirectUri) {
      const decoded = Buffer.from(redirectUri, 'base64').toString();
      const isValidRedirectUri = validateUrl({
        urlString: decoded,
        allowedProtocols: TRUSTED_LOCALHOST_PROTOCOLS,
        allowedHostnames: TRUSTED_LOCALHOST_HOSTNAMES,
      });

      if (!isValidRedirectUri) {
        return null;
      }

      baseURL = decoded;
    }

    return `${baseURL}?mnemonic=${btoa(user.mnemonic)}&newToken=${btoa(newToken)}&privateKey=${btoa(user.keys.ecc.privateKey)}`;
  };

  // Should redirect to login in the useEffect
  if (!user) return <></>;

  const handleGoToLogin = () => {
    dispatch(userThunks.logoutThunk());
  };

  const handleGoToUniversalLinkUrl = () => {
    const universalLinkAuthUrl = getUniversalLinkAuthUrl(user);
    if (!universalLinkAuthUrl) {
      notificationsService.show({ text: translate('auth.universalLink.invalidRedirectUri'), type: ToastType.Error });
      return;
    }

    globalThis.location.href = universalLinkAuthUrl;
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden dark:bg-[#0A0F1C]">
      <AnimatedBackground />

      <div className="relative z-20 flex shrink-0 flex-row justify-center py-10 sm:justify-center">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-gray-10 bg-white px-8 py-10 shadow-subtle dark:bg-gray-1 dark:border-gray-5 ">
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
      <div className="relative z-10 flex shrink-0 flex-col items-center justify-center space-x-0 space-y-2 py-8 sm:flex-row sm:space-x-8 sm:space-y-0">
        {!isMobile && (
          <a href="https://internxt.com/legal" target="_blank" rel="noopener noreferrer" className="auth-footer-link">
            {translate('general.terms')}
          </a>
        )}
        <a href="https://help.internxt.com" target="_blank" rel="noopener noreferrer" className="auth-footer-link">
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
}
