import { Fragment, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';
import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope';
import { Link } from 'react-router-dom';

import userService from '../../services/user.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import { IFormValues } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import i18n from 'app/i18n/services/i18n.service';

const RemoveAccount = (): JSX.Element => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    getValues,
  } = useForm<IFormValues>({ mode: 'onChange' });

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const sendEmail = async (email: string) => {
    try {
      setIsLoading(true);
      await userService.sendDeactivationEmail(email);
      notificationsService.show({ text: i18n.get('success.accountDeactivationEmailSent'), type: ToastType.Success });
    } catch (err: unknown) {
      notificationsService.show({ text: i18n.get('error.deactivatingAccount'), type: ToastType.Error });
    } finally {
      setIsLoading(false);
      setStep(2);
    }
  };

  const onSubmit: SubmitHandler<IFormValues> = (formData) => {
    sendEmail(formData.email);
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-96 flex-col items-center">
        <div className="flex w-2/3 items-center justify-around">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-blue-60 text-blue-60 ${
              step === 2 && 'cursor-pointer'
            }`}
            onClick={() => setStep(1)}
          >
            1
          </div>

          <div className={`h-px w-20 border-t ${step === 2 ? 'border-blue-60' : 'border-neutral-60'}`} />

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border ${
              step === 2 ? 'border-blue-60 text-blue-60' : 'border-neutral-60 text-neutral-60'
            }`}
          >
            2
          </div>
        </div>

        <span className="mt-14 font-semibold text-neutral-900">Internxt security</span>

        {step === 1 ? (
          <Fragment>
            <p className="my-6 text-center text-base text-neutral-500">
              As specified during the sign up process, Internxt Drive encrypts your files, and only you have access to
              those. We never know your password, and thus, that way, only you can decrypt your account. For that
              reason, if you forget your password, we can't restore your account. What we can do, however, is to delete
              your account and erase all its files, so that you can sign up again. Please enter your email below so that
              we can process the account removal.
            </p>

            <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
              <BaseInput
                className="mb-2.5"
                placeholder="Email"
                label="email"
                type="email"
                icon={<UilEnvelope className="w-4" />}
                register={register}
                required={true}
                minLength={{ value: 1, message: 'Email must not be empty' }}
                pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
                error={errors.email}
              />

              <BaseButton disabled={isLoading || !isValid} className="primary w-full">
                {isLoading ? 'Sending email...' : 'Send email'}
              </BaseButton>
            </form>

            <Link className="mt-4" to="/login">
              Back to login
            </Link>
          </Fragment>
        ) : (
          <Fragment>
            <p className="my-6 text-center text-xs text-neutral-500">
              Please check your email and follow the instructions to deactivate your account so you can start using
              Internxt Drive again. Once you deactivate your account, you will be able to sign up using the same email
              address. Please store your password somewhere safe. With Internxt Drive, only you are the true owner of
              your files on the cloud. With great power there must also come great responsibility.
            </p>

            <BaseButton className="primary w-full" disabled={isLoading} onClick={() => sendEmail(getValues().email)}>
              Re-send deactivation email
            </BaseButton>
            <Link className="mt-4" to="/login">
              Back to login
            </Link>
          </Fragment>
        )}
      </div>
    </div>
  );
};

export default RemoveAccount;
