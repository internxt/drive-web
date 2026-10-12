import isValidEmail from '@internxt/lib/dist/auth/isValidEmail';
import { Button, Input } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { FormEvent, useState } from 'react';
import { useResendAccountSetupEmail } from '../hooks/useResendAccountSetupEmail';

export const InvalidLinkMessage = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const [email, setEmail] = useState('');
  const { isSending, isEmailSent, resendEmail } = useResendAccountSetupEmail();

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    void resendEmail(email);
  };

  if (isEmailSent) {
    return (
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-medium text-gray-100">{translate('accountSetup.invalidLink.emailSentTitle')}</h1>
        <p className="text-base text-gray-60">
          {translate('accountSetup.invalidLink.emailSentDescription', { email })}
        </p>
      </div>
    );
  }

  return (
    <form className="flex flex-col space-y-5" onSubmit={submitEmail}>
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-medium text-gray-100">{translate('accountSetup.invalidLink.title')}</h1>
        <p className="text-base text-gray-60">{translate('accountSetup.invalidLink.description')}</p>
      </div>
      <Input
        label={translate('accountSetup.invalidLink.emailLabel')}
        variant="email"
        value={email}
        onChange={setEmail}
        required={true}
      />
      <Button disabled={!isValidEmail(email)} loading={isSending} variant="primary" className="w-full" type="submit">
        {translate('accountSetup.invalidLink.resendButton')}
      </Button>
    </form>
  );
};
