import { useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux';

import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import AuthButton from 'app/shared/components/AuthButton';
import { changePassword } from '../../services/auth.service';
import UilLock from '@iconscout/react-unicons/icons/uil-lock';
import UilEyeSlash from '@iconscout/react-unicons/icons/uil-eye-slash';
import UilEye from '@iconscout/react-unicons/icons/uil-eye';
import errorService from 'app/core/services/error.service';
import { AppView, IFormValues, LocalStorageItem } from 'app/core/types';
import navigationService from 'app/core/services/navigation.service';
import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import { decryptTextWithKey } from '../../../crypto/services/utils';
import localStorageService from '../../../core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Link } from 'react-router-dom';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export default function RecoverView(): JSX.Element {
  const { translate } = useTranslationContext();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  if (!isAuthenticated) {
    navigationService.push(AppView.Login);
  }

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const lastPassword = useWatch({ control, name: 'lastPassword', defaultValue: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLastPassword, setShowLastPassword] = useState(false);
  const [showLastPasswordError, setShowLastPasswordError] = useState(false);
  const [showCurrentPasswordError, setShowCurrentPasswordError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;

  const onSubmit: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    setIsProcessing(true);
    const { password, lastPassword } = formData;

    try {
      const currentMnemonic = user.mnemonic;
      const isCorrupted = checkIfMnemonicIsCorrupted(currentMnemonic);

      if (isCorrupted) {
        try {
          await restoreCorruptedMnemonic(user, lastPassword, password);
          setShowLastPasswordError(false);
          successfulRecovery();
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'INVALID_CURRENT_PASSWORD') {
              setShowCurrentPasswordError(true);
              setShowLastPasswordError(false);
            } else {
              setShowLastPasswordError(true);
              setShowCurrentPasswordError(false);
            }
          }
        }
      } else {
        goHome();
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      console.error('Login error. ' + castedError.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkIfMnemonicIsCorrupted = (mnemonic: string): boolean => {
    const valid = /([a-z]*\s)/.test(mnemonic);
    return !valid;
  };

  const isCorrupted = checkIfMnemonicIsCorrupted(user.mnemonic);
  if (!isCorrupted) {
    // User has nothing to do here
    navigationService.push(AppView.Login);
  }

  const restoreCorruptedMnemonic = async (
    user: UserSettings,
    last_password: string,
    current_password: string,
  ): Promise<void> => {
    const mnemonic = user.mnemonic;

    const clearMnemonic = decryptTextWithKey(mnemonic, last_password);
    const isCorrupted = checkIfMnemonicIsCorrupted(clearMnemonic);

    if (isCorrupted) {
      throw new Error('Provided last password is not valid or needs more iterations');
    } else {
      // We got the clean mnemonic
      // Store it on the state
      setMnemonicToStorage(clearMnemonic);
      // Update persistence
      await changePassword(current_password, current_password, user.email).catch(() => {
        // If there is error, rollback corrupted mnemonic for next try
        setMnemonicToStorage(mnemonic);
        // And alert parent
        throw new Error('INVALID_CURRENT_PASSWORD');
      });
    }
  };

  const setMnemonicToStorage = (mnemonic) => {
    const newUser = {
      ...user,
      mnemonic: mnemonic,
    };
    localStorageService.set(LocalStorageItem.User, JSON.stringify(newUser));
    localStorageService.set('xMnemonic', mnemonic);
  };

  const goHome = () => {
    navigationService.push(AppView.Drive);
  };

  const successfulRecovery = () => {
    setShowSuccess(true);
    setTimeout(goHome, 2000);
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex w-full flex-col items-center justify-center">
        {showSuccess ? (
          <div className="flex w-72 flex-col items-center">
            <span className="mt-3.5 cursor-pointer text-center text-sm font-medium text-primary hover:text-primary-dark">
              Your keys have been recovered correctly.
              <br />
              You can upload your content now.
            </span>
          </div>
        ) : (
          <form className="flex w-72 flex-col" onSubmit={handleSubmit(onSubmit)}>
            <div className="mt-3 flex w-full justify-center text-sm">
              <span className="mr-2 font-medium">
                We are going to recover your original key, please introduce your passwords.
              </span>
            </div>
            <span className="mb-6 mt-1.5 text-sm text-gray-70" />

            <BaseInput
              className="mb-2.5"
              placeholder="Current password"
              label={'password'}
              type={showPassword ? 'text' : 'password'}
              icon={
                password ? (
                  showPassword ? (
                    <UilEyeSlash className="w-4" onClick={() => setShowPassword(false)} />
                  ) : (
                    <UilEye className="w-4" onClick={() => setShowPassword(true)} />
                  )
                ) : (
                  <UilLock className="w-4" />
                )
              }
              register={register}
              required={true}
              minLength={{ value: 1, message: translate('error.emptyPassword') }}
              error={errors.password}
            />

            <BaseInput
              className="mb-2.5"
              placeholder="Previous password"
              label={'lastPassword'}
              type={showLastPassword ? 'text' : 'password'}
              icon={
                lastPassword ? (
                  showLastPassword ? (
                    <UilEyeSlash className="w-4" onClick={() => setShowLastPassword(false)} />
                  ) : (
                    <UilEye className="w-4" onClick={() => setShowLastPassword(true)} />
                  )
                ) : (
                  <UilLock className="w-4" />
                )
              }
              register={register}
              required={true}
              minLength={{ value: 1, message: translate('error.emptyPassword') }}
              error={errors.password}
            />

            {showLastPasswordError && (
              <div className="my-1 flex">
                <span className="w-56 text-sm font-medium text-red">{translate('error.lastPasswordError')}</span>
              </div>
            )}
            {showCurrentPasswordError && (
              <div className="my-1 flex">
                <span className="w-56 text-sm font-medium text-red">{translate('error.incorrectPassword')}</span>
              </div>
            )}

            <div className="mt-2">
              <AuthButton
                isDisabled={isProcessing || !isValid}
                text="Recover"
                textWhenDisabled={isValid ? 'Decrypting...' : 'Recover'}
              />
            </div>

            <div className="mt-3 flex w-full justify-center text-sm">
              <span className="mr-2">Don't you know what this is about?</span>
              <Link to="/">Go home</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
