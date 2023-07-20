import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

import { Link } from 'react-router-dom';
import { WarningCircle, Envelope } from '@phosphor-icons/react';
import userService from '../../services/user.service';

import { IFormValues } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import TextInput from '../TextInput/TextInput';
import Button from '../Button/Button';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

function RecoveryLink(): JSX.Element {
  const { translate } = useTranslationContext();
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
    // try {
    //   setIsLoading(true);
    //   await userService.sendDeactivationEmail(email);
    //   notificationsService.show({ text: translate('success.accountDeactivationEmailSent'), type: ToastType.Success });
    //   if (showErrors === false) {
    //     setStep(2);
    //   }
    // } catch (err: unknown) {
    //   notificationsService.show({ text: translate('error.deactivatingAccount'), type: ToastType.Error });
    //   setEmailErrors(translate('error.deactivatingAccount') as string);
    //   setShowErrors(true);
    // } finally {
    //   setIsLoading(false);
    // }
  };

  const onSubmit: SubmitHandler<IFormValues> = (formData, event) => {
    event?.preventDefault();
    sendEmail(formData.email);
    setEmail(formData.email);
  };

  return (
    <>
      {step === 1 ? (
        <div className="flex w-96 flex-col rounded-2xl bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-medium text-gray-100">{translate('auth.forgotPassword.title')}</h1>
          <form className="mt-5 w-full" onSubmit={handleSubmit(onSubmit)}>
            <label className="space-y-1">
              <span className="font-regular text-sm text-gray-80">{translate('auth.email')}</span>
              <TextInput
                placeholder={translate('auth.email')}
                label="email"
                type="email"
                register={register}
                onFocus={() => setShowErrors(false)}
                required={true}
                minLength={{ value: 1, message: translate('notificationMessages.emailNotEmpty') }}
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
              text={isLoading ? translate('auth.forgotPassword.sending') : translate('auth.forgotPassword.continue')}
              loading={isLoading}
              style="button-primary"
              disabledText="Send instructions"
              className="mt-4 w-full"
            />
          </form>
          <div className="mt-4 flex w-full justify-center">
            <p className="font-regular mr-2 text-base">{translate('auth.forgotPassword.password')}</p>
            <Link to="/login" className="cursor-pointer text-base font-medium text-primary no-underline">
              {translate('auth.forgotPassword.login')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex w-80 flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-soft">
          <Envelope size={80} className="text-primary" weight="thin" />
          <div>
            <h4 className="mt-4 text-xl font-medium">{translate('auth.forgotPassword.successTitle')}</h4>
            <p className="font-regular mt-1 w-64 text-base text-gray-60">
              {translate('auth.forgotPassword.successDescription')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default RecoveryLink;
