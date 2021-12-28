import React, { SetStateAction, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import UilLock from '@iconscout/react-unicons/icons/uil-lock';
import UilEyeSlash from '@iconscout/react-unicons/icons/uil-eye-slash';
import UilEye from '@iconscout/react-unicons/icons/uil-eye';

import AuthButton from 'app/shared/components/AuthButton';
import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import { IFormValues } from '../../../../../types';
import { deactivate2FA } from 'app/auth/services/auth.service';
import { twoFactorRegexPattern } from 'app/core/services/validation.service';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'app/core/services/error.service';

interface Deactivate2FAProps {
  passwordSalt: string;
  setHas2FA: React.Dispatch<SetStateAction<boolean>>;
}

const Deactivate2FA = ({ passwordSalt, setHas2FA }: Deactivate2FAProps): JSX.Element => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const twoFactorCode = useWatch({ control, name: 'twoFactorCode', defaultValue: '' });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactorCode, setShowTwoFactorCode] = useState(false);

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    try {
      setIsLoading(true);
      await deactivate2FA(passwordSalt, formData.password, formData.twoFactorCode);

      notificationsService.show(i18n.get('success.twoFactorAuthDisabled'), ToastType.Success);
      setHas2FA(false);
      reset();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(castedError.message || i18n.get('error.serverError'), ToastType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="flex w-full flex-col space-y-4" onSubmit={handleSubmit(onSubmit)}>

      <BaseInput
        label="password"
        placeholder="Password"
        type={showPassword ? 'text' : 'password'}
        error={errors.password}
        register={register}
        required={true}
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
        minLength={1}
      />

      <BaseInput
        label="twoFactorCode"
        placeholder="Two-Factor Authentication code"
        type={showTwoFactorCode ? 'text' : 'password'}
        error={errors.twoFactorCode}
        register={register}
        required={true}
        icon={
          twoFactorCode ? (
            showTwoFactorCode ? (
              <UilEyeSlash className="w-4" onClick={() => setShowTwoFactorCode(false)} />
            ) : (
              <UilEye className="w-4" onClick={() => setShowTwoFactorCode(true)} />
            )
          ) : (
            <UilLock className="w-4" />
          )
        }
        minLength={1}
        pattern={twoFactorRegexPattern}
      />

      <AuthButton
        text="Disable Two-Factor Authentication"
        textWhenDisabled={isValid ? 'Disabling...' : 'Disable Two-Factor Authentication'}
        isDisabled={isLoading || !isValid}
      />
    </form>
  );
};

export default Deactivate2FA;
