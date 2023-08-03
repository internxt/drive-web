import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from 'app/auth/services/auth.service';
import Input from 'app/shared/components/Input';
import Button from 'app/shared/components/Button/Button';
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
      setEmailErrors(translate('auth.forgotPassword.ivalidEmail'));
    }
  };

  return (
    <>
      {step === 1 ? (
        <div className="flex w-96 flex-col rounded-2xl bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-medium text-gray-100">{translate('auth.forgotPassword.title')}</h1>
          <form
            className="mt-5 w-full"
            onSubmit={(event) => {
              onSendEmail(event);
            }}
          >
            <Input
              placeholder={translate('auth.email')}
              label={translate('auth.email')}
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
                  <WarningCircle weight="fill" className="mr-1 h-4 text-red-std" />
                </div>
                <span className="font-base w-56 text-sm text-red-60">{emailErrors}</span>
              </div>
            )}
            <Button type="submit" variant="primary" className="mt-4 w-full">
              {translate('auth.forgotPassword.continue')}
            </Button>
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
