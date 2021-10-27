import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import UilLock from '@iconscout/react-unicons/icons/uil-lock';
import UilEyeSlash from '@iconscout/react-unicons/icons/uil-eye-slash';
import UilEye from '@iconscout/react-unicons/icons/uil-eye';
import UilShieldPlus from '@iconscout/react-unicons/icons/uil-shield-plus';
import { isValidPasswordRegex } from '@internxt/lib/dist/src/auth/isValidPassword';

import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import { useState } from 'react';
import { changePassword } from 'app/auth/services/auth.service';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import AccountAdvice from 'app/shared/components/AccountAdvice/AccountAdvice';
import { IFormValues } from '../../../../types';
import errorService from '../../../../services/error.service';

const AccountPasswordTab = (): JSX.Element => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const confirmPassword = useWatch({ control, name: 'confirmPassword', defaultValue: '' });
  const currentPassword = useWatch({ control, name: 'currentPassword', defaultValue: '' });
  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      setIsLoading(true);
      await changePassword(formData.password, formData.currentPassword, formData.email);
      notificationsService.show(i18n.get('success.passwordChanged'), ToastType.Success);
      reset();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(castedError.message, ToastType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const formInputError = Object.values(errors)[0];
  let bottomInfoError = '';

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="mb-6 font-semibold">{i18n.get('views.account.tabs.password.advice1.title')}</h2>
      <p className="mb-11">{i18n.get('views.account.tabs.password.advice1.description')}</p>

      <div className="flex justify-center">
        <form className="w-full max-w-sm grid grid-cols-1 gap-6 mb-14" onSubmit={handleSubmit(onSubmit)}>
          <BaseInput
            placeholder="Current password"
            label="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            icon={
              currentPassword ? (
                showCurrentPassword ? (
                  <UilEyeSlash className="w-4 text-blue-40" onClick={() => setShowCurrentPassword(false)} />
                ) : (
                  <UilEye className="w-4 text-blue-40" onClick={() => setShowCurrentPassword(true)} />
                )
              ) : (
                <UilLock className="w-4 text-blue-40" />
              )
            }
            register={register}
            required={true}
            minLength={1}
            error={errors.currentPassword}
          />
          <BaseInput
            placeholder="New password"
            label="password"
            type={showNewPassword ? 'text' : 'password'}
            icon={
              password ? (
                showNewPassword ? (
                  <UilEyeSlash className="w-4 text-blue-40" onClick={() => setShowNewPassword(false)} />
                ) : (
                  <UilEye className="w-4 text-blue-40" onClick={() => setShowNewPassword(true)} />
                )
              ) : (
                <UilLock className="w-4 text-blue-40" />
              )
            }
            register={register}
            required={true}
            minLength={1}
            error={errors.password}
            pattern={{
              value: isValidPasswordRegex,
              message: 'The password must contain lowercase/uppercase letters and at least a number',
            }}
          />
          <BaseInput
            placeholder="Confirm new password"
            label="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            icon={
              confirmPassword ? (
                showConfirmPassword ? (
                  <UilEyeSlash className="w-4 text-blue-40" onClick={() => setShowConfirmPassword(false)} />
                ) : (
                  <UilEye className="w-4 text-blue-40" onClick={() => setShowConfirmPassword(true)} />
                )
              ) : (
                <UilLock className="w-4 text-blue-40" />
              )
            }
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.confirmPassword}
            pattern={{
              value: isValidPasswordRegex,
              message: 'The password must contain lowercase/uppercase letters and at least a number',
            }}
          />

          {bottomInfoError && (
            <div className="flex my-1">
              <span className="block  w-full text-red-60 text-sm font-medium">{bottomInfoError}</span>
            </div>
          )}

          <BaseButton className="primary" disabled={isLoading || !isValid}>
            {isLoading || !isValid ? (isValid ? 'Changing password...' : 'Change password') : 'Change password'}
          </BaseButton>
        </form>
      </div>

      <span className="mb-9">{i18n.get('views.account.tabs.password.advice2.title')}</span>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 w-full justify-around mb-14">
        <AccountAdvice
          icon={UilShieldPlus}
          title={i18n.get('views.account.tabs.password.advice3.title')}
          description={i18n.get('views.account.tabs.password.advice3.description')}
        />
        <AccountAdvice
          icon={UilShieldPlus}
          title={i18n.get('views.account.tabs.password.advice4.title')}
          description={i18n.get('views.account.tabs.password.advice4.description')}
        />
      </div>
    </div>
  );
};

export default AccountPasswordTab;
