import { useState } from 'react';
import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { resendAccountSetupEmail } from 'services/account-setup.service';
import errorService from 'services/error.service';

interface ResendAccountSetupEmailButtonProps {
  email: string;
}

export const ResendAccountSetupEmailButton = ({ email }: ResendAccountSetupEmailButtonProps) => {
  const { translate } = useTranslationContext();
  const [isSending, setIsSending] = useState(false);

  const onResendClicked = async () => {
    setIsSending(true);
    try {
      await resendAccountSetupEmail(email);
      notificationsService.show({ text: translate('checkout.accountSetup.emailResent'), type: ToastType.Success });
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({ text: translate('checkout.accountSetup.resendEmailError'), type: ToastType.Error });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button type="button" variant="secondary" loading={isSending} disabled={isSending} onClick={onResendClicked}>
      {translate('checkout.accountSetup.resendEmail')}
    </Button>
  );
};
