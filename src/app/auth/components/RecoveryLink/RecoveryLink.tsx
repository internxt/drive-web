import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from 'app/auth/services/auth.service';
import Input from 'app/shared/components/Input';
import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { WarningCircle, Envelope } from '@phosphor-icons/react';
import errorService from 'app/core/services/error.service';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';

function RecoveryLink(): JSX.Element {
  const { translate } = useTranslationContext();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [emailErrors, setEmailErrors] = useState('');

  const onSendEmail = async (event) => {
    event.preventDefault();

    if (isValidEmail(email)) {
      try {
        await authService.sendChangePasswordEmail(email);
        setStep(2);
      } catch (error) {
        setEmailErrors(translate('auth.forgotPassword.notFound'));
        setShowErrors(true);
        errorService.reportError(error);
      }
    } else {
      setShowErrors(true);
      setEmailErrors(translate('auth.forgotPassword.invalidEmail'));
    }
  };

  return (
    <>
      {step === 1 ? (
        <div className="flex w-96 flex-col space-y-5 p-8">
          <h1 className="text-3xl font-medium text-gray-100">{translate('auth.forgotPassword.title')}</h1>

          <form
            className="flex w-full flex-col items-start space-y-2"
            onSubmit={(event) => {
              onSendEmail(event);
            }}
          >
            <Input
              placeholder={translate('auth.email')}
              className="w-full"
              value={email}
              onFocus={() => setShowErrors(false)}
              onChange={(email) => {
                setEmail(email);
              }}
              required={true}
            />

            {showErrors && (
              <div className="mt-2 flex flex-row items-start pb-3">
                <div className="flex h-5 flex-row items-center">
                  <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
                </div>
                <span className="font-base w-56 text-sm text-red">{emailErrors}</span>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full">
              {translate('auth.forgotPassword.continue')}
            </Button>
          </form>

          <div className="w-full border-b border-gray-10" />

          <div className="flex w-full justify-center space-x-1.5 font-medium">
            <span>{translate('auth.forgotPassword.password')}</span>
            <Link to="/login" className="cursor-pointer text-primary no-underline">
              {translate('auth.forgotPassword.login')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex w-80 flex-col items-center justify-center space-y-5 p-8 text-center">
          <Envelope size={80} className="text-primary" weight="thin" />

          <div className="flex flex-col items-center space-y-2">
            <h1 className="text-3xl font-medium">{translate('auth.forgotPassword.successTitle')}</h1>

            <p className="font-regular w-64 text-base text-gray-80">
              {translate('auth.forgotPassword.successDescription')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default RecoveryLink;
