import React, { Fragment } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import AuthButton from '../../components/Buttons/AuthButton';
import BaseInput from '../../components/Inputs/BaseInput';
import { IFormValues } from '../../models/interfaces';
import { emailRegexPattern } from '../../services/validation.service';
import history from '../../lib/history';
import { useState } from 'react';
import { sendDeactivationEmail } from '../../services/user.service';
import notify from '../../components/Notifications';
import BaseButton from '../../components/Buttons/BaseButton';
import { UilEnvelope } from '@iconscout/react-unicons';

const RemoveAccount = (): JSX.Element => {
  const { register, formState: { errors, isValid }, handleSubmit, getValues } = useForm<IFormValues>({ mode: 'onChange' });

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const sendEmail = async (email: string) => {
    try {
      setIsLoading(true);
      await sendDeactivationEmail(email);
      notify('Deactivation email sent!', 'success');
    } catch (err) {
      notify('Error deactivating account. Please contact us.', 'error');
    } finally {
      setIsLoading(false);
      setStep(2);
    }
  };

  const onSubmit: SubmitHandler<IFormValues> = formData => {
    sendEmail(formData.email);
  };

  return (
    <div className='w-full h-full flex items-center justify-center'>
      <div className='flex flex-col w-96 items-center'>
        <div className='flex justify-around items-center w-2/3'>
          <div className={`flex items-center justify-center w-9 h-9 rounded-full border border-blue-60 text-blue-60 ${step === 2 && 'cursor-pointer'}`}
            onClick={() => setStep(1)}
          >1</div>

          <div className={`h-px w-20 border-t ${step === 2 ? 'border-blue-60' : 'border-m-neutral-60'}`} />

          <div className={`flex items-center justify-center w-9 h-9 rounded-full border ${step === 2 ? 'border-blue-60 text-blue-60' : 'border-m-neutral-60 text-m-neutral-60'}`}>2</div>
        </div>

        <span className='text-neutral-900 font-semibold mt-14'>Internxt security</span>

        {step === 1 ?
          <Fragment>
            <p className='text-neutral-500 text-base my-6 text-center'>
              As specified during the sign up process, Internxt Drive encrypts your files, and only you have access to those. We never know your password, and thus, that
              way, only you can decrypt your account. For that reason, if you forget your password, we can't restore your account. What we can do, however, is to delete your account and erase
              all its files, so that you can sign up again. Please enter your email below so that we can process the account removal.
            </p>

            <form className='w-full' onSubmit={handleSubmit(onSubmit)}>
              <BaseInput
                placeholder='Email'
                label='email'
                type='email'
                icon={<UilEnvelope className='w-4'/>}
                register={register}
                required={true}
                minLength={{ value: 1, message: 'Email must not be empty' }}
                pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
                error={errors.email}
              />

              <AuthButton isDisabled={isLoading || !isValid} text='Send email' textWhenDisabled={isValid ? 'Sending email...' : 'Send email'} />
            </form>

            <BaseButton classes='button_link' onClick={() => history.push('/login')}>
              Back to login
            </BaseButton>
          </Fragment>
          :
          <Fragment>
            <p className='text-neutral-500 text-xs my-6 text-center'>
              Please check your email and follow the instructions to deactivate your account so you can start using Internxt Drive again. Once you deactivate your account,
              you will be able to sign up using the same email address. Please store your password somewhere safe. With Internxt Drive, only you
              are the true owner of your files on the cloud. With great power there must also come great responsibility.
            </p>

            <BaseButton classes='primary w-full' disabled={isLoading} onClick={() => sendEmail(getValues().email)}>
              Re-send deactivation email
            </BaseButton>
            <BaseButton classes='button_link mt-2' onClick={() => history.push('/login')}>
              Back to login
            </BaseButton>
          </Fragment>
        }
      </div>
    </div>
  );
};

export default RemoveAccount;
