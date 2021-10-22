import { useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import * as Unicons from '@iconscout/react-unicons';

import BaseButton from '../../../../../../components/Buttons/BaseButton';
import BaseInput from '../../../../../../components/forms/inputs/BaseInput';
import authService from '../../../../../../../auth/services/auth.service';
import errorService from '../../../../../../../core/services/error.service';
import i18n from '../../../../../../../i18n/services/i18n.service';
import notificationsService, { ToastType } from '../../../../../../../notifications/services/notifications.service';
import { twoFactorRegexPattern } from '../../../../../../../core/services/validation.service';
import { TwoFactorAuthStepProps } from '.';
import { IFormValues } from '../../../../../../types';

const TwoFactorAuthEnableStep = (props: TwoFactorAuthStepProps): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTwoFactorCode, setShowTwoFactorCode] = useState(false);
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<IFormValues>({ mode: 'onChange' });
  const twoFactorCode = useWatch({ control, name: 'twoFactorCode', defaultValue: '' });
  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    try {
      if (formData.backupKey !== props.backupKey) {
        setError(i18n.get('error.backupKeyDontMatch'));
        return;
      }
      setIsLoading(true);

      await authService.store2FA(props.backupKey, formData.twoFactorCode);
      notificationsService.show(i18n.get('success.twoFactorAuthActivated'), ToastType.Success);
      props.setHas2FA(true);
      reset();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(castedError.message || i18n.get('error.serverError'), ToastType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className="text-center square flex justify-center w-full flex-col py-8 px-16"
      onSubmit={handleSubmit(onSubmit)}
    >
      <span className="security-info_texts mb-8">
        Finally, to enable Two-Factor Authentication, fill the fields below.
      </span>

      <div>
        <BaseInput
          className="mb-4"
          label="backupKey"
          placeholder="Backup key"
          type="text"
          error={errors.backupKey}
          register={register}
          required={true}
          minLength={1}
        />

        <div className="mx-2" />

        <BaseInput
          className="mb-4"
          label="twoFactorCode"
          placeholder="Two-Factor authentication code"
          type={showTwoFactorCode ? 'text' : 'password'}
          error={errors.twoFactorCode}
          register={register}
          required={true}
          icon={
            twoFactorCode ? (
              showTwoFactorCode ? (
                <Unicons.UilEyeSlash className="w-4 text-blue-40" onClick={() => setShowTwoFactorCode(false)} />
              ) : (
                <Unicons.UilEye className="w-4 text-blue-40" onClick={() => setShowTwoFactorCode(true)} />
              )
            ) : (
              <Unicons.UilLock className="w-4 text-blue-40" />
            )
          }
          minLength={1}
          pattern={twoFactorRegexPattern}
        />
      </div>

      {error && (
        <div className="flex mt-1 mb-4">
          <span className="text-red-60 text-sm w-56 font-medium">{error}</span>
        </div>
      )}

      <BaseButton className="primary" disabled={isLoading || !isValid}>
        {isLoading || !isValid
          ? isValid
            ? 'Configuring Two-Factor Authenticator...'
            : 'Enable Two-Factor Authentication'
          : 'Enable Two-Factor Authentication'}
      </BaseButton>
    </form>
  );
};

export default TwoFactorAuthEnableStep;
