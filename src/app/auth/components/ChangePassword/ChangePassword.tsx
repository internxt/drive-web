import { Dispatch, SetStateAction, useState, RefObject, createRef, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import authService from 'app/auth/services/auth.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { IFormValues } from 'app/core/types';
import Button from 'app/auth/components/Button/Button';
import BackupButton from 'app/shared/components/Button/Button';
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';
import { MAX_PASSWORD_LENGTH } from 'app/shared/components/ValidPassword';
import { CaretLeft, FileArrowUp, Warning, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { validateMnemonic } from 'bip39';

interface ChangePasswordProps {
  setHasBackupKey: Dispatch<SetStateAction<boolean | undefined>>;
}

export default function ChangePassword(props: ChangePasswordProps): JSX.Element {
  const { translate } = useTranslationContext();
  const {
    register,
    formState: { errors },
    handleSubmit,
    control,
  } = useForm<IFormValues>({ mode: 'onChange' });

  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const confirmPassword = useWatch({ control, name: 'confirmPassword', defaultValue: '' });
  const [backupKeyInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [buckupKeyContent, setBackupKeyContent] = useState<string>('');
  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);
  const [isValidPassword, setIsValidPassword] = useState(false);
  const [isEqualPassword, setIsEqualPassword] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countDown, setCountDown] = useState<number>(10);

  const [passwordState, setPasswordState] = useState<{
    tag: 'error' | 'warning' | 'success';
    label: string;
  } | null>(null);

  useEffect(() => {
    if (password.length > 0) onChangeHandler(password);
    confirmPassword && confirmPassword != password ? setIsEqualPassword(false) : setIsEqualPassword(true);
  }, [password]);

  useEffect(() => {
    const confirmPasswordLength = confirmPassword.length;
    const firstLettersPassord = password.substring(0, confirmPasswordLength);
    confirmPassword && confirmPassword != firstLettersPassord ? setIsEqualPassword(false) : setIsEqualPassword(true);
  }, [confirmPassword]);

  useEffect(() => {
    if (countDown > 0 && isEmailSent) {
      const timer = setInterval(() => {
        setCountDown(countDown - 1);
      }, 1000);
      return () => clearInterval(timer);
    }

    countDown === 0 && window.location.assign(`${window.location.origin}/login`);
  }, [isEmailSent, countDown]);

  const uploadBackupKey = () => {
    backupKeyInputRef.current?.click();
  };

  const onUploadBackupKeyInputChanged = async (e) => {
    const file = e.target.files[0];
    const backupKey = await file.text();
    const isValidBackupKey = validateMnemonic(backupKey);

    isValidBackupKey
      ? setBackupKeyContent(backupKey)
      : notificationsService.show({
          text: translate('auth.recoverAccount.changePassword.backupKeyError'),
          type: ToastType.Error,
        });
  };

  function onChangeHandler(input: string) {
    setIsValidPassword(false);
    if (input.length > MAX_PASSWORD_LENGTH) {
      setPasswordState({ tag: 'error', label: translate('modals.changePasswordModal.errors.longPassword') });
      return;
    }

    const result = testPasswordStrength(input, '');

    setIsValidPassword(result.valid);

    if (!result.valid) {
      setPasswordState({
        tag: 'error',
        label:
          result.reason === 'NOT_COMPLEX_ENOUGH'
            ? translate('auth.recoverAccount.changePassword.notPasswordStrength')
            : translate('auth.recoverAccount.changePassword.shortPasswordStrength'),
      });
    } else if (result.strength === 'medium') {
      setPasswordState({
        tag: 'warning',
        label: translate('auth.recoverAccount.changePassword.warningPasswordStrength'),
      });
    } else {
      setPasswordState({
        tag: 'success',
        label: translate('auth.recoverAccount.changePassword.successPasswordStrength'),
      });
    }
  }

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    setIsLoading(true);

    const token = window.location.pathname.split('/').pop();
    const { password } = formData;
    const mnemonic = buckupKeyContent;

    if (!token) {
      notificationsService.show({
        text: translate('auth.recoverAccount.changePassword.tokenError'),
        type: ToastType.Error,
      });
      throw new Error();
    }

    try {
      await authService.updateCredentialsWithToken(token, password, mnemonic, '');
      setIsEmailSent(true);
    } catch (error) {
      notificationsService.show({
        text: translate('auth.recoverAccount.changePassword.serverError'),
        type: ToastType.Error,
      });
    }
    setIsLoading(false);
  };

  return (
    <>
      {!buckupKeyContent ? (
        <>
          <input
            className="hidden"
            ref={backupKeyInputRef}
            type="file"
            onChange={onUploadBackupKeyInputChanged}
            accept=".txt"
          />
          <span
            onClick={() => props.setHasBackupKey(undefined)}
            className="font-regular mb-1 flex cursor-pointer items-center text-base text-blue-60"
          >
            <CaretLeft size={18} weight="thin" className="mr-0.5" />
            {translate('auth.recoverAccount.title')}
          </span>
          <h3 className="mb-5 text-2xl font-medium">{translate('auth.recoverAccount.backupKey.title')}</h3>
          <div className="font-regular mb-4 flex rounded-md border border-orange-dark border-opacity-30 bg-orange-dark bg-opacity-5 p-4 text-sm text-orange-dark">
            <span className="mr-1.5 pt-0.5">
              <Warning size={18} weight="fill" />
            </span>
            <p>{translate('auth.recoverAccount.backupKey.alert')}</p>
          </div>
          <BackupButton
            loading={false}
            variant="primary"
            className="mb-2 w-full text-base font-medium text-white"
            onClick={uploadBackupKey}
          >
            <span className="flex items-center">
              <FileArrowUp size={24} className="mr-2" />
              {translate('auth.recoverAccount.backupKey.button')}
            </span>
          </BackupButton>
        </>
      ) : (
        <>
          {!isEmailSent ? (
            <>
              <span
                onClick={() => setBackupKeyContent('')}
                className="font-regular mb-1 flex cursor-pointer items-center text-base text-blue-60"
              >
                <CaretLeft size={18} weight="thin" className="mr-0.5" />
                {translate('auth.recoverAccount.backupKey.title')}
              </span>
              <h3 className="mb-5 text-2xl font-medium">{translate('auth.recoverAccount.changePassword.title')}</h3>
              <form className="flex w-full flex-col space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col space-y-3">
                  <label className="space-y-0.5">
                    <span className="font-regular text-sm text-gray-80">
                      {translate('auth.recoverAccount.changePassword.newPassword')}
                    </span>
                    <PasswordInput
                      className={passwordState ? passwordState.tag : ''}
                      placeholder=""
                      label="password"
                      maxLength={MAX_PASSWORD_LENGTH}
                      register={register}
                      onFocus={() => setShowPasswordIndicator(true)}
                      required={true}
                      error={errors.password}
                    />
                    {showPasswordIndicator && passwordState && (
                      <PasswordStrengthIndicator
                        className="pt-1"
                        strength={passwordState.tag}
                        label={passwordState.label}
                      />
                    )}
                  </label>

                  <label className="space-y-0.5">
                    <span
                      className={`font-regular text-sm ${
                        !isValidPassword && !confirmPassword ? 'text-gray-40' : 'text-gray-80'
                      }`}
                    >
                      {translate('auth.recoverAccount.changePassword.repeatNewPassword')}
                    </span>
                    <PasswordInput
                      disabled={!isValidPassword && !confirmPassword}
                      placeholder=""
                      label="confirmPassword"
                      register={register}
                      required={true}
                      error={errors.password}
                    />
                    {confirmPassword && !isEqualPassword && (
                      <div className="flex flex-row items-start pt-1">
                        <div className="flex h-5 flex-row items-center">
                          <WarningCircle weight="fill" className="mr-1 h-4 text-red-std" />
                        </div>
                        <span className="font-base w-56 text-sm text-red-60">
                          {translate('auth.recoverAccount.changePassword.notMatch')}
                        </span>
                      </div>
                    )}
                  </label>
                  <Button
                    disabled={!(password === confirmPassword && isValidPassword)}
                    text={translate('auth.recoverAccount.changePassword.submitButton')}
                    disabledText={translate('auth.recoverAccount.changePassword.submitButton')}
                    loading={isLoading}
                    style="button-primary"
                    className="w-full"
                  />
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <CheckCircle size={80} className="mb-4 text-primary" weight="thin" />
              <h3 className="font-gray-100 mb-1 text-2xl font-medium">
                {translate('auth.recoverAccount.changePassword.emailSent.title')}
              </h3>
              <p className="font-gray-80 font-regular mb-5 text-center text-sm">
                {translate('auth.recoverAccount.changePassword.emailSent.description')}
              </p>
              <div className="font-regular mb-2 flex w-full justify-center rounded-lg border border-gray-10 bg-gray-1 p-4 text-sm text-gray-100">
                {translate('auth.recoverAccount.changePassword.emailSent.redirect')}
                <span className="font-medium">&nbsp;{countDown}</span>
              </div>
              <Link to="/login" className="w-full cursor-pointer no-underline">
                <Button
                  text={translate('auth.recoverAccount.changePassword.emailSent.button')}
                  loading={false}
                  style="button-primary"
                  className="mb-2 w-full"
                />
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
