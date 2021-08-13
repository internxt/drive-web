import React, { SetStateAction } from 'react';
import { useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';

import { IFormValues } from '../../../../models/interfaces';
import { store2FA } from '../../../../services/auth.service';
import AuthButton from '../../../../components/Buttons/AuthButton';
import BaseInput from '../../../../components/Inputs/BaseInput';
import { twoFactorRegexPattern } from '../../../../services/validation.service';
import notify, { ToastType } from '../../../../components/Notifications';
import googleAuthenticatorIcon from '../../../../assets/icons/google-authenticator.svg';
import appStoreIcon from '../../../../assets/icons/app-store.svg';
import playStoreIcon from '../../../../assets/icons/play-store.svg';
import { UilLock, UilEyeSlash, UilEye } from '@iconscout/react-unicons';
import i18n from '../../../../services/i18n.service';

interface StepsProps {
  currentStep: number,
  qr: string,
  backupKey: string,
  setHas2FA: React.Dispatch<SetStateAction<boolean>>
}

const Steps = ({ currentStep, qr, backupKey, setHas2FA }: StepsProps): JSX.Element => {
  const { register, formState: { errors, isValid }, handleSubmit, control, reset } = useForm<IFormValues>({ mode: 'onChange' });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTwoFactorCode, setShowTwoFactorCode] = useState(false);
  const twoFactorCode = useWatch({ control, name: 'twoFactorCode', defaultValue: '' });

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      if (formData.backupKey !== backupKey) {
        setError(i18n.get('error.backupKeyDontMatch'));
        return;
      }
      setIsLoading(true);

      await store2FA(backupKey, formData.twoFactorCode);
      notify(i18n.get('success.twoFactorAuthActivated'), ToastType.Success);
      setHas2FA(true);
      reset();
    } catch (err) {
      notify(err.message || i18n.get('error.serverError'), ToastType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStep === 2) {
    return (
      <div className="flex flex-col">
        <div>Use Authy, Google Authentication or a similar app to scan the QR Code below</div>
        <div className="flex items-center">
          <img src={qr} alt="Bidi Code" />
          <div className="flex flex-col justify-between h-full py-3 ml-4">
            <div className="bg-l-neutral-20 p-4 rounded-md w-max font-semibold text-neutral-500 select-text">{backupKey}</div>
            <div className="security-info_texts">If you are unable to scan the QR code<br />enter this code into the app.</div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className='flex flex-col items-center'>
        <div className='security-info_texts text-center'>Your backup key is below. You will need this incase you lose your device.<br />Keep an offline backup of your key. Keep it safe and secure.</div>
        <div className="bg-l-neutral-20 p-4 rounded-md w-max font-semibold text-neutral-500 mt-4 select-text">{backupKey}</div>
      </div>
    );
  }

  if (currentStep === 4) {
    return (
      <form className='flex w-full flex-col' onSubmit={handleSubmit(onSubmit)}>
        <span className='security-info_texts mb-4'>Finally, to enable Two-Factor Authentication, fill the fields below.</span>

        <div className='flex justify-between'>
          <BaseInput
            label='backupKey'
            placeholder='Backup key'
            type='text'
            error={errors.backupKey}
            register={register}
            required={true}
            minLength={1} />

          <div className='mx-2' />

          <BaseInput
            label='twoFactorCode'
            placeholder='Two-Factor authentication code'
            type={showTwoFactorCode ? 'text' :'password'}
            error={errors.twoFactorCode}
            register={register}
            required={true}
            icon={twoFactorCode ?
              (showTwoFactorCode ?
                <UilEyeSlash className='w-4' onClick={() => setShowTwoFactorCode(false)}/>
                :
                <UilEye className='w-4' onClick={() => setShowTwoFactorCode(true)}/>) :
              <UilLock className='w-4'/>
            }
            minLength={1}
            pattern={twoFactorRegexPattern} />
        </div>

        {
          error &&
          <div className='flex mt-1 mb-4'>
            <span className='text-red-60 text-sm w-56 font-medium'>{error}</span>
          </div>
        }

        <AuthButton
          text='Enable Two-Factor Authentication'
          textWhenDisabled={isValid ? 'Configuring Two-Factor Authenticator...' : 'Enable Two-Factor Authentication'}
          isDisabled={isLoading || !isValid} />
      </form>
    );
  }

  return (
    <div className="box-step-1">
      <div className='text-sm text-neutral-700'>Download Authy, Google Authenticator or a similar app on your device.</div>
      <div className='flex items-center mt-4'>
        <img src={googleAuthenticatorIcon} className='mr-8' height={48} width={48} alt="Google Authenticator" />
        <img src={appStoreIcon} className='mr-2' height={48} width={150} alt="App Store" />
        <img src={playStoreIcon} height={48} width={150} alt="Google Play" />
      </div>
    </div>
  );
};

export default Steps;
