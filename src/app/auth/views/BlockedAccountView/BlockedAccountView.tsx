import navigationService from 'app/core/services/navigation.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import { ShieldWarning } from '@phosphor-icons/react';
import { Button, Loader } from '@internxt/ui';
import { AppView } from 'app/core/types';
import { useCallback, useEffect, useState } from 'react';
import queryString from 'query-string';
import { useParams } from 'react-router-dom';
import authService from 'app/auth/services/auth.service';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import ExpiredLink from 'app/shared/views/ExpiredLink/ExpiredLinkView';
import { ResendButton } from '../../components/ResendButton/ResendButton';

const COUNTDOWN_TIME = 30;

export default function BlockedAccountView(): JSX.Element {
  const { translate } = useTranslationContext();
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalidToken, setIsInvalidToken] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [enableResendButton, setEnableResendButton] = useState(true);
  const [countDown, setCountDown] = useState<number>(COUNTDOWN_TIME);

  const { token } = useParams<{ token: string }>();

  const goToRecoveryLink = () => {
    navigationService.push(AppView.RecoveryLink);
  };

  useEffect(() => {
    const queryParameters = navigationService.history.location.search;
    const email = queryString.parse(queryParameters).email as string;
    setUserEmail(email);
  }, []);

  useEffect(() => {
    const unblockAccount = async () => {
      if (token) {
        try {
          setIsLoading(true);
          await authService.unblockAccount(token);
          navigationService.push(AppView.Login);
        } catch (error) {
          errorService.reportError(error);
          setIsInvalidToken(true);
        }
      }
      setIsLoading(false);
    };
    unblockAccount();
  }, [token]);

  useEffect(() => {
    if (!enableResendButton && countDown > 0) {
      setTimeout(() => {
        setCountDown(countDown - 1);
      }, 1000);
    } else {
      setEnableResendButton(true);
      setCountDown(COUNTDOWN_TIME);
    }
  }, [enableResendButton, countDown]);

  const resendAccountUnblockEmail = useCallback(async () => {
    setSendingEmail(true);
    try {
      await authService.requestUnblockAccount(userEmail);
      setEnableResendButton(false);
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({
        text: translate('error.serverError'),
        type: ToastType.Error,
      });
    } finally {
      setSendingEmail(false);
    }
  }, [userEmail]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader classNameLoader="h-7 w-7" />
      </div>
    );
  }

  if (isInvalidToken) {
    return <ExpiredLink />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-surface dark:bg-gray-1">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex w-96 flex-col items-center justify-center text-center">
          <ShieldWarning size={80} className="mb-5 text-primary" weight="thin" />
          <h2 className="mb-4 text-3xl font-medium text-gray-100">{translate('blockedAccount.title')}</h2>
          <p className="font-regular mb-4 text-base text-gray-80">{translate('blockedAccount.text1')}</p>
          <p className="font-regular mb-4 text-base text-gray-80">
            {translate('blockedAccount.text2', { email: userEmail })}
          </p>
          <Button
            loading={false}
            variant="secondary"
            className="mb-5 h-11 w-full text-base font-medium"
            onClick={goToRecoveryLink}
          >
            {translate('blockedAccount.forgotPassword')}
          </Button>
          <span className="mb-5 h-px w-72 bg-gray-10"></span>
          <p className="font-regular flex flex-row items-center justify-center text-base text-gray-80">
            {translate('blockedAccount.text3')}
            {sendingEmail === true ? (
              <Loader classNameLoader="ml-2 h-5 w-5 text-primary" />
            ) : (
              <ResendButton
                enableButton={enableResendButton}
                onClick={resendAccountUnblockEmail}
                countDown={countDown}
              />
            )}
          </p>
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
    </div>
  );
}
