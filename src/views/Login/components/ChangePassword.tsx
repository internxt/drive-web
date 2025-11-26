import { Button } from '@internxt/ui';
import { CaretLeft, FileArrowUp, Warning } from '@phosphor-icons/react';
import { authService, errorService, localStorageService } from 'services';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { validateMnemonic } from 'bip39';
import { Dispatch, RefObject, SetStateAction, createRef, useState } from 'react';
import PasswordResetForm from './PasswordResetForm';
import SuccessRedirectView from './SuccessRedirectView';

interface ChangePasswordProps {
  setHasBackupKey: Dispatch<SetStateAction<boolean | undefined>>;
}

export default function ChangePassword(props: Readonly<ChangePasswordProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const [backupKeyInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [backupKeyContent, setBackupKeyContent] = useState<string>('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const uploadBackupKey = () => {
    backupKeyInputRef.current?.click();
  };

  const onUploadBackupKeyInputChanged = async (e) => {
    const file = e.target.files[0];
    const uploadedBackupKeyContent = await file.text();

    try {
      const backupData = JSON.parse(uploadedBackupKeyContent);

      if (backupData.mnemonic && validateMnemonic(backupData.mnemonic)) {
        setBackupKeyContent(uploadedBackupKeyContent);
        return;
      }
    } catch (err) {
      errorService.reportError(err);
      if (validateMnemonic(uploadedBackupKeyContent)) {
        setBackupKeyContent(uploadedBackupKeyContent);
        return;
      }
    }

    notificationsService.show({
      text: translate('auth.recoverAccount.changePassword.backupKeyError'),
      type: ToastType.Error,
    });
  };

  const onSendNewPassword = async (password: string) => {
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
      await authService.recoverAccountWithBackupKey(token, password, backupKeyContent);

      localStorageService.clear();
      setIsEmailSent(true);
    } catch (error) {
      notificationsService.show({
        text: translate('auth.recoverAccount.changePassword.serverError'),
        type: ToastType.Error,
      });
      errorService.reportError(error);
    }
    setIsLoading(false);
  };

  return (
    <>
      {backupKeyContent ? (
        <>
          {isEmailSent ? (
            <SuccessRedirectView
              title={translate('auth.recoverAccount.changePassword.emailSent.title')}
              description={translate('auth.recoverAccount.changePassword.emailSent.description')}
              buttonText={translate('auth.recoverAccount.changePassword.emailSent.button')}
            />
          ) : (
            <>
              <button
                onClick={() => setBackupKeyContent('')}
                className="font-regular mb-1 flex w-fit cursor-pointer items-center text-base text-primary"
              >
                <CaretLeft size={18} className="mr-0.5" />
                {translate('auth.recoverAccount.backupKey.title')}
              </button>
              <h3 className="mb-5 text-2xl font-medium">{translate('auth.recoverAccount.changePassword.title')}</h3>
              <PasswordResetForm
                onSubmit={onSendNewPassword}
                isLoading={isLoading}
                submitButtonText={translate('auth.recoverAccount.changePassword.submitButton')}
              />
            </>
          )}
        </>
      ) : (
        <>
          <input
            className="hidden"
            ref={backupKeyInputRef}
            type="file"
            onChange={onUploadBackupKeyInputChanged}
            accept=".txt"
          />
          <button
            onClick={() => props.setHasBackupKey(undefined)}
            className="font-regular mb-1 flex w-fit cursor-pointer items-center text-base text-primary"
          >
            <CaretLeft size={18} className="mr-0.5" />
            {translate('auth.recoverAccount.title')}
          </button>
          <h3 className="mb-5 text-2xl font-medium">{translate('auth.recoverAccount.backupKey.title')}</h3>
          <div className="font-regular mb-4 flex rounded-md border border-orange/30 bg-orange/5 p-4 text-sm text-orange-dark">
            <span className="mr-1.5 pt-0.5">
              <Warning size={18} weight="fill" />
            </span>
            <p>{translate('auth.recoverAccount.backupKey.alert')}</p>
          </div>
          <Button
            loading={false}
            variant="primary"
            className="mb-2 w-full text-base font-medium text-white"
            onClick={uploadBackupKey}
          >
            <span className="flex items-center">
              <FileArrowUp size={24} className="mr-2" />
              {translate('auth.recoverAccount.backupKey.button')}
            </span>
          </Button>
        </>
      )}
    </>
  );
}
