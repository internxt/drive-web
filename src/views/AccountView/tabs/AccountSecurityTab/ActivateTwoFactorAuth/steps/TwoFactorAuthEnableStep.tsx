import { useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import * as Unicons from '@iconscout/react-unicons';

import BaseButton from '../../../../../../components/Buttons/BaseButton';
import BaseInput from '../../../../../../components/Inputs/BaseInput';
import { IFormValues } from '../../../../../../models/interfaces';
import authService from '../../../../../../services/auth.service';
import errorService from '../../../../../../services/error.service';
import i18n from '../../../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../../../services/notifications.service';
import { twoFactorRegexPattern } from '../../../../../../services/validation.service';
import { TwoFactorAuthStepProps } from '.';

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
    <form className="flex w-full flex-col" onSubmit={handleSubmit(onSubmit)}>
      <span className="security-info_texts mb-4">
        Finally, to enable Two-Factor Authentication, fill the fields below.
      </span>

      <div className="flex justify-between">
        <BaseInput
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
          label="twoFactorCode"
          placeholder="Two-Factor authentication code"
          type={showTwoFactorCode ? 'text' : 'password'}
          error={errors.twoFactorCode}
          register={register}
          required={true}
          icon={
            twoFactorCode ? (
              showTwoFactorCode ? (
                <Unicons.UilEyeSlash className="w-4" onClick={() => setShowTwoFactorCode(false)} />
              ) : (
                <Unicons.UilEye className="w-4" onClick={() => setShowTwoFactorCode(true)} />
              )
            ) : (
              <Unicons.UilLock className="w-4" />
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

      <BaseButton disabled={isLoading || !isValid}>
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
