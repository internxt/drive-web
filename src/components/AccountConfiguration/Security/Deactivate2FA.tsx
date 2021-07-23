import React, { SetStateAction } from 'react';
import { useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { IFormValues } from '../../../models/interfaces';
import { deactivate2FA } from '../../../services/auth.service';
import { twoFactorRegexPattern } from '../../../services/validation.service';
import AuthButton from '../../Buttons/AuthButton';
import AuthInput from '../../Inputs/AuthInput';
import notify from '../../Notifications';

interface Deactivate2FAProps {
  passwordSalt: string,
  setHas2FA: React.Dispatch<SetStateAction<boolean>>
}

const Deactivate2FA = ({ passwordSalt, setHas2FA }: Deactivate2FAProps): JSX.Element => {
  const { register, formState: { errors }, handleSubmit, control, reset } = useForm<IFormValues>({ mode: 'onChange' });
  const password = useWatch({ control, name: 'password', defaultValue: '' });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      setIsLoading(true);
      await deactivate2FA(passwordSalt, formData.password, formData.twoFactorCode);

      notify('Your Two-Factor Authentication has been disabled', 'success');
      setHas2FA(false);
      reset();
    } catch (err) {
      console.log(err);
      notify(err.message || 'Internal server error. Try again later', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className='flex w-full flex-col mt-8' onSubmit={handleSubmit(onSubmit)}>
      <span className='security-info_texts mb-4 text-center'>You already have Two-Factor Authentication enabled. If you want to disable it, fill the fields below.</span>

      <div className='flex justify-between'>
        <AuthInput
          label='password'
          placeholder='Password'
          type={showPassword ? 'text' :'password'}
          error={errors.password}
          register={register}
          required={true}
          icon={password
            ? showPassword ? 'eyeSlashGray' : 'eyeGray'
            : 'lockGray'
          }
          minLength={1}
          onClick={() => setShowPassword(!showPassword)} />

        <div className='mx-2' />

        <AuthInput
          label='twoFactorCode'
          placeholder='Two-Factor code'
          type='text'
          error={errors.twoFactorCode}
          register={register}
          required={true}
          icon='lockGray'
          minLength={1}
          pattern={twoFactorRegexPattern} />
      </div>

      <AuthButton
        text='Disable Two-Factor Authentication'
        textWhenDisabled='Disabling...'
        isDisabled={isLoading} />
    </form>
  );
};

export default Deactivate2FA;
