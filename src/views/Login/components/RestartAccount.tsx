import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { authService, errorService } from 'services';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { CaretLeft, WarningCircle } from '@phosphor-icons/react';
import PasswordResetForm from './PasswordResetForm';
import SuccessRedirectView from './SuccessRedirectView';

interface RestartAccount {
  setHasBackupKey: Dispatch<SetStateAction<boolean | undefined>>;
}

export default function RestartAccount(props: Readonly<RestartAccount>): JSX.Element {
  const { translate } = useTranslationContext();
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onAccountReset = async (password: string) => {
    setIsLoading(true);

    const token = globalThis.location.pathname.split('/').pop();

    if (!token) {
      notificationsService.show({
        text: translate('auth.recoverAccount.changePassword.tokenError'),
        type: ToastType.Error,
      });
      setIsLoading(false);
      return;
    }

    try {
      await authService.resetAccountWithToken(token, password);
      setIsEmailSent(true);
    } catch (error) {
      const castedError = errorService.castError(error);
      notificationsService.show({
        text: translate('auth.restartAccount.error'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
      errorService.reportError(error);
    }

    setIsLoading(false);
  };

  return (
    <>
      {isEmailSent ? (
        <SuccessRedirectView
          title={translate('auth.recoverAccount.changePassword.emailSent.title')}
          description={translate('auth.restartAccount.successDescription')}
          buttonText={translate('auth.recoverAccount.changePassword.emailSent.button')}
        />
      ) : (
        <>
          <button
            onClick={() => props.setHasBackupKey(undefined)}
            className="font-regular mb-1 flex w-fit cursor-pointer items-center text-base text-primary"
          >
            <CaretLeft size={18} className="mr-0.5" />
            {translate('auth.recoverAccount.title')}
          </button>
          <h3 className="mb-1 text-2xl font-medium">{translate('auth.restartAccount.title')}</h3>
          <p className="font-regular mb-5 text-sm text-gray-80">{translate('auth.restartAccount.description')}</p>
          <div className="font-regular mb-4 flex rounded-md border border-red/30 bg-red/5 p-4 text-sm text-red-dark">
            <span className="mr-1.5 pt-0.5">
              <WarningCircle size={18} weight="fill" className="text-red" />
            </span>
            <div className="flex flex-col">
              <p>{translate('auth.restartAccount.alert1')}</p>
            </div>
          </div>
          <PasswordResetForm
            onSubmit={onAccountReset}
            isLoading={isLoading}
            submitButtonText={translate('auth.recoverAccount.changePassword.submitButton')}
            submitButtonVariant="destructive"
          />
        </>
      )}
    </>
  );
}
