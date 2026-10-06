import { useState } from 'react';
import { Button } from '@internxt/ui';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';

import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { resendAccountSetupEmail } from 'services/account-setup.service';
import errorService from 'services/error.service';

type ResendStatus = 'idle' | 'sending' | 'sent' | 'failed';

interface AccountSetupPendingNoticeProps {
  email: string;
}

export const AccountSetupPendingNotice = ({ email }: AccountSetupPendingNoticeProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [resendStatus, setResendStatus] = useState<ResendStatus>('idle');

  const resendEmail = async () => {
    setResendStatus('sending');
    try {
      await resendAccountSetupEmail(email);
      setResendStatus('sent');
    } catch (error) {
      errorService.reportError(error);
      setResendStatus('failed');
    }
  };

  return (
    <div className="flex flex-col space-y-3 pt-1">
      <div className="flex flex-row items-start">
        <div className="flex h-5 flex-row items-center">
          <WarningCircle weight="fill" className="mr-1 h-4 text-primary" />
        </div>
        <div className="flex flex-col text-sm">
          <span className="font-medium text-gray-100">{translate('auth.accountSetupPending.title')}</span>
          <span className="text-gray-60">{translate('auth.accountSetupPending.message')}</span>
        </div>
      </div>

      {resendStatus === 'sent' ? (
        <div role="status" className="flex flex-row items-center text-sm text-green">
          <CheckCircle weight="fill" className="mr-1 h-4" />
          <span>{translate('auth.accountSetupPending.emailSent')}</span>
        </div>
      ) : (
        <Button type="button" variant="secondary" loading={resendStatus === 'sending'} onClick={resendEmail}>
          {translate('auth.accountSetupPending.resend')}
        </Button>
      )}

      {resendStatus === 'failed' && (
        <span role="alert" className="text-sm text-red">
          {translate('auth.accountSetupPending.resendFailed')}
        </span>
      )}
    </div>
  );
};
