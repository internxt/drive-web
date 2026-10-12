import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useState } from 'react';
import { resendAccountSetupEmail } from 'services/account-setup.service';
import errorService from 'services/error.service';

export const useResendAccountSetupEmail = () => {
  const { translate } = useTranslationContext();
  const [isSending, setIsSending] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const resendEmail = async (email: string) => {
    setIsSending(true);

    try {
      await resendAccountSetupEmail(email);
      setIsEmailSent(true);
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({
        text: translate('accountSetup.invalidLink.resendError'),
        type: ToastType.Error,
        requestId: errorService.castError(error).requestId,
      });
    } finally {
      setIsSending(false);
    }
  };

  return { isSending, isEmailSent, resendEmail };
};
