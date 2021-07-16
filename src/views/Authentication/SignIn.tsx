import React from 'react';
import CheckboxPrimary from '../../components/Checkboxes/CheckboxPrimary';
import AuthInput from '../../components/Inputs/AuthInput';
import AuthButton from '../../components/Buttons/AuthButton';
import { IconTypes } from '../../models/enums';
import { getIcon } from '../../services/getIcon';
import { emailRegexPattern } from '../../services/validation.service';

const SignIn = (): JSX.Element => {
  return (
    <div>
      <form className='flex flex-col w-56' onSubmit={handleSubmit(onSubmit)}>
        <img src={getIcon(IconTypes.InternxtLongLogo)} width='110' alt="" />
        <span className='text-sm text-neutral-500 mt-1.5 mb-6'>Cloud Storage</span>

        <div className='relative'>
          <AuthInput
            placeholder='Email'
            label='email'
            type='email'
            icon={IconTypes.MailGray}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
            error={errors.email}
          />
        </div>

        <div className='relative'>
          <AuthInput
            placeholder='Password'
            label={'password'}
            type={showPassword ? 'text' : 'password'}
            icon={password
              ? showPassword ? IconTypes.EyeSlashGray : IconTypes.EyeGray
              : IconTypes.LockGray
            }
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.password}
            onClick={handlePasswordInputClick}
          />
        </div>

        {
          loginError && showErrors &&
          <div className='flex ml-3 my-1'>
            <div className='w-1.5 h-1.5 bg-neutral-600 rounded-full mt-1.5 mr-2' />
            <span className='text-neutral-600 text-sm'>{loginError}</span>
          </div>
        }

        <div className='flex flex-col'>
          <CheckboxPrimary label='remember' text='Remember me' required={false} register={register} />
          <AuthButton isDisabled={isLoggingIn} text='Sign in' textWhenDisabled='Decrypting...' />
        </div>
      </form>

      <div className='flex flex-col items-center w-56'>
        <a href="" target='_blank' className='transition duration-200 easi-in-out text-sm text-center text-blue-60 hover:text-blue-80 mt-3.5'>Forgot your password?</a>

        <div className='flex w-full justify-between text-sm mt-3'>
          <span>Don't have an account?</span>
          <button className='transition duration-200 easi-in-out text-center text-blue-60 underline hover:text-blue-80 hover:underline'
            onClick={() => setShowRegister(true)}
          >Get started</button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
