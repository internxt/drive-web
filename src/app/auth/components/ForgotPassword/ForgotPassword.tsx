import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

import { Link } from 'react-router-dom';
import { CaretLeft, WarningCircle } from 'phosphor-react';
import userService from '../../services/user.service';

import { IFormValues } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { get } from 'app/i18n/services/i18n.service';
import TextInput from '../TextInput/TextInput';
import Button from '../Button/Button';

function ForgotPassword(): JSX.Element {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<IFormValues>({ mode: 'onChange' });

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [getEmail, setEmail] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [emailErrors, setEmailErrors] = useState('');

  const sendEmail = async (email: string) => {
    try {
      setIsLoading(true);
      await userService.sendDeactivationEmail(email);
      notificationsService.show({ text: get('success.accountDeactivationEmailSent'), type: ToastType.Success });
      if (showErrors === false) {
        setStep(2);
      }
    } catch (err: unknown) {
      //notificationsService.show({ text: get('error.deactivatingAccount'), type: ToastType.Error });
      setEmailErrors(get('error.deactivatingAccount'));
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
    <div className="flex h-fit w-96 flex-col items-center justify-center rounded-2xl bg-white px-8 py-10 sm:shadow-soft">
      <div className="flex flex-col space-y-3">
        <div className="flex flex-col space-y-1">
          <Link
            to="/login"
            className="flex cursor-pointer flex-row items-center space-x-0.5 text-primary no-underline focus:text-primary-dark"
          >
            <CaretLeft className="h-4 w-4" weight="bold" />
            <span className="font-medium">Log in</span>
          </Link>

          <div className="flex flex-col space-y-1">
            <h1 className="text-2xl font-medium text-gray-100">Forgot password</h1>
            <p className="font-regular text-sm text-gray-80">
              As specified in the security section of the app, your password is used for encryption and decryption and
              only you have access to it. Therefore, we can't restore your account without the password. You can
              register again by entering your email below so we can delete your account and all your files.
            </p>
          </div>
        </div>

        {step === 1 ? (
          <>
            <form className="w-full space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <label className="space-y-1">
                <span>Email</span>
                <TextInput
                  placeholder="Email"
                  label="email"
                  type="email"
                  register={register}
                  onFocus={() => setShowErrors(false)}
                  required={true}
                  minLength={{ value: 1, message: 'Email must not be empty' }}
                  error={errors.email}
                />
                {showErrors && (
                  <div className="-mt-2 flex flex-row items-start pb-3">
                    <div className="flex h-5 flex-row items-center">
                      <WarningCircle weight="fill" className="mr-1 h-4 text-red-std" />
                    </div>
                    <span className="font-base w-56 text-sm text-red-60">{emailErrors}</span>
                  </div>
                )}
              </label>

              <Button
                disabled={isLoading}
                text={isLoading ? 'Sending email...' : 'Send instructions'}
                loading={isLoading}
                style="button-primary"
                disabledText="Send instructions"
                className="w-full"
              />
            </form>
          </>
        ) : (
          <>
            <div className="flex w-full flex-col items-center justify-center space-y-2 rounded-lg border border-gray-10 bg-gray-1 p-4 text-center text-sm">
              <span className="w-full break-all">
                <span className="whitespace-nowrap">Email sent to</span> <span className="font-medium">{getEmail}</span>
              </span>

              <p className="text-gray-50">
                The email link access will expire in 24h. If you are not receiving the email, please check your
                promotions or spam inbox.
              </p>

              <span
                onClick={() => setStep(1)}
                className="cursor-pointer font-medium text-primary hover:text-primary-dark"
              >
                Change email
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
