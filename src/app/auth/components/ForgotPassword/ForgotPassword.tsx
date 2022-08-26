import { Fragment, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';

import ExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle';
import { Link } from 'react-router-dom';
import {CaretLeft} from 'phosphor-react';
import userService from '../../services/user.service';

import { IFormValues } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import i18n from 'app/i18n/services/i18n.service';
import TextInput from '../TextInput/TextInput';
import Button from '../Button/Button';

function ForgotPassword(): JSX.Element {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
  } = useForm<IFormValues>({ mode: 'onChange' });

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [getEmail, setEmail] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const[emailErrors, setEmailErrors] = useState('');

  const sendEmail = async (email: string) => {
    try {
      setIsLoading(true);
      await userService.sendDeactivationEmail(email);
      notificationsService.show({ text: i18n.get('success.accountDeactivationEmailSent'), type: ToastType.Success });
       if(showErrors === false){
        setStep(2);
      };
    } catch (err: unknown) {
      //notificationsService.show({ text: i18n.get('error.deactivatingAccount'), type: ToastType.Error });
      setEmailErrors(i18n.get('error.deactivatingAccount'));
      setShowErrors(true);
     
    } finally {
      setIsLoading(false);
     
    }
  };

  const onSubmit: SubmitHandler<IFormValues> = (formData) => {
   
      sendEmail(formData.email);
      setEmail(formData.email);
    
   
  };

  return (
      <div className="flex flex-col items-center justify-center text-left w-96 h-fit rounded-2xl bg-white shadow-md">
       
        <div className='flex flex-col w-80'>
          <div className='flex cursor-pointer mt-10'>
            <CaretLeft className='text-blue-60 mt-1'/>
            <Link className=" text-sm text-center no-underline font-medium text-blue-60 hover:text-blue-80 appearance-none" to="/login">
                Log in
            </Link>
          </div>
          <span className="mt-2 mb-1 font-medium text-2xl text-gray-100">Forgot password</span>
          <div>
            <p className="text-sm font-regular text-gray-80">
              To see the recovery options, please enter your email, we'll guide you to recover your account.
            </p>
          </div>
          {step === 1 ? (
            <Fragment>
              

              <form className="w-full mt-6 mb-10" onSubmit={handleSubmit(onSubmit)}>

                <span className="mb-1">Email</span>
                <TextInput
                  className='mb-4'
                  placeholder="Email"
                  label="email"
                  type="email"
                  register={register}
                  onFocus={()=>setShowErrors(false)}
                  required={true}
                  minLength={{ value: 1, message: 'Email must not be empty' }}
                  pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
                  error={errors.email}
                />

                {showErrors && (
                  <div className="flex mt-0.5 mb-2">
                    <ExclamationTriangle className='h-4 mt-0.5 mr-1 text-red-60'/>
                    <span className="text-red-60 text-sm w-56 font-base">{emailErrors}</span>
                  </div>
                )}
                <Button 
                  disabled={isLoading || !isValid} 
                  text={isLoading ? 'Sending email...' : 'Send instructions'}
                  loading={isLoading}
                  type='primary'
                  disabledText='Send instructions'
                  />
              </form>

              
            </Fragment>
          ) : (
           
            <Fragment>
              <div className='mt-6 mb-10 bg-gray-1 items-center justify-center rounded-lg border border-gray-10 h-36 w-80'>
                <div className='flex mb-2 mt-5 text-center justify-center'>
                
                  <span className="mr-1 text-sm mt-0.5">
                      Email sent to
                  </span>
                  <span className="font-medium text-sm mt-0.5">
                      {getEmail}
                  </span>
                </div>
                <p className="mx-4 mb-2 text-center justify-center text-xs text-gray-50">
                  The email link access will expire in 24h. If you are not receiving the email, please check your promotions or spam inbox.
                </p>

                <div className='flex text-center justify-center mb-5'>
                
                  <span onClick={()=>setStep(1)} className="mb-0.5 text-sm cursor-pointer text-center justify-center no-underline font-medium text-blue-60 hover:text-blue-80 appearance-none">
                      Change email
                  </span>
                </div>
              </div>
              
            </Fragment>
          )}
        </div>
      </div>
   
  );
};

export default ForgotPassword;
