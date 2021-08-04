import { SubmitHandler, useForm, useWatch } from 'react-hook-form';

import { IFormValues } from '../../../../models/interfaces';
import BaseInput from '../../../../components/Inputs/BaseInput';
import AuthButton from '../../../../components/Buttons/AuthButton';
import { useState } from 'react';
import { changePassword } from '../../../../services/auth.service';
import notify from '../../../../components/Notifications';
import { UilLock, UilEyeSlash, UilEye } from '@iconscout/react-unicons';

const AccountPasswordTab = (): JSX.Element => {
  const { register, formState: { errors, isValid }, handleSubmit, control, reset } = useForm<IFormValues>({ mode: 'onChange' });

  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const confirmPassword = useWatch({ control, name: 'confirmPassword', defaultValue: '' });
  const currentPassword = useWatch({ control, name: 'currentPassword', defaultValue: '' });
  const [error, setError] = useState<Error | string>();

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      setIsLoading(true);
      await changePassword(formData.password, formData.currentPassword, formData.email);
      notify('Password changed successfully', 'success');
      reset();
      setError('');
    } catch (err) {
      setError(err.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full h-full flex flex-col items-center justify-center'>
      <h1 className='account_config_title mt-16'>Change password</h1>
      <p className='account_config_description'>Remember that if you change your password, you will he signed out in all your devices. You will need these credentials for logging in again.</p>

      <form className='w-64 mt-5' onSubmit={handleSubmit(onSubmit)}>
        <BaseInput
          placeholder='Current password'
          label='currentPassword'
          type={showCurrentPassword ? 'text' : 'password'}
          icon={currentPassword ?
            (showCurrentPassword ?
              <UilEyeSlash className='w-4' onClick={() => setShowCurrentPassword(false)}/>
              :
              <UilEye className='w-4' onClick={() => setShowCurrentPassword(true)} />) :
            <UilLock className='w-4'/>
          }
          register={register}
          required={true}
          minLength={1}
          error={errors.currentPassword}
        />
        <BaseInput
          placeholder='New password'
          label='password'
          type={showNewPassword ? 'text' : 'password'}
          icon={password ?
            (showNewPassword ?
              <UilEyeSlash className='w-4' onClick={() => setShowNewPassword(false)}/>
              :
              <UilEye className='w-4' onClick={() => setShowNewPassword(true)}/>) :
            <UilLock className='w-4'/>
          }
          register={register}
          required={true}
          minLength={1}
          error={errors.password}
        />
        <BaseInput
          placeholder='Confirm new password'
          label='confirmPassword'
          type={showConfirmPassword ? 'text' : 'password'}
          icon={confirmPassword ?
            (showConfirmPassword ?
              <UilEyeSlash className='w-4' onClick={() => setShowConfirmPassword(false)} />
              : <UilEye className='w-4' onClick={() => setShowConfirmPassword(true)}/>) :
            <UilLock className='w-4'/>
          }
          register={register}
          required={true}
          minLength={{ value: 1, message: 'Password must not be empty' }}
          error={errors.confirmPassword}
        />

        {
          error &&
          <div className='flex mt-1 mb-4 pl-2'>
            <div className='w-1.5 h-1.5 bg-neutral-600 rounded-full mt-2' />
            <span className='text-neutral-600 text-sm w-56 ml-2.5'>{error}</span>
          </div>
        }

        <AuthButton text='Change password' textWhenDisabled={isValid ? 'Changing password...' : 'Change password'} isDisabled={isLoading || !isValid} />
      </form>
    </div>
  );
};

export default AccountPasswordTab;
