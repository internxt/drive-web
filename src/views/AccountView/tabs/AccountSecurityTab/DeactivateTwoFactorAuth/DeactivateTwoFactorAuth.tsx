import React, { SetStateAction, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { UilLock, UilEyeSlash, UilEye } from '@iconscout/react-unicons';

import { IFormValues } from '../../../../../models/interfaces';
import { deactivate2FA } from '../../../../../services/auth.service';
import { twoFactorRegexPattern } from '../../../../../services/validation.service';
import AuthButton from '../../../../../components/Buttons/AuthButton';
import BaseInput from '../../../../../components/Inputs/BaseInput';
import i18n from '../../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../../services/notifications.service';
import errorService from '../../../../../services/error.service';

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
    <form className="flex w-full flex-col mt-8" onSubmit={handleSubmit(onSubmit)}>
      <span className="security-info_texts mb-4 text-center">
        You already have Two-Factor Authentication enabled. If you want to disable it, fill the fields below.
      </span>

      <div className="flex justify-between">
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

        <div className="mx-2" />

        <BaseInput
          label="twoFactorCode"
          placeholder="Two-Factor authentication code"
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
      </div>

      <AuthButton
        text="Disable Two-Factor Authentication"
        textWhenDisabled={isValid ? 'Disabling...' : 'Disable Two-Factor Authentication'}
        isDisabled={isLoading || !isValid}
      />
    </form>
  );
};

export default Deactivate2FA;
