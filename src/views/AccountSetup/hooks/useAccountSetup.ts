import { HTTP_STATUS_CODES } from 'app/core/constants';
import { AppView } from 'app/core/types';
import { useAppDispatch } from 'app/store/hooks';
import { useState } from 'react';
import errorService from 'services/error.service';
import navigationService from 'services/navigation.service';
import { completeAccountSetup } from '../services/completeAccountSetup';

export type AccountSetupStatus = 'form' | 'invalidLink' | 'accountAlreadyExists';

/**
 * Messages the backend sends when the link can no longer be used. Other 403s (e.g. a failed
 * captcha) must not be shown as an invalid link.
 */
const INVALID_LINK_MESSAGES = new Set(['Invalid token', 'Token expired']);

export const useAccountSetup = (setupToken: string) => {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<AccountSetupStatus>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitFailed, setHasSubmitFailed] = useState(false);

  const handleSetupError = (error: unknown) => {
    const { status: httpStatus, message } = errorService.castError(error);
    const isInvalidLink = httpStatus === HTTP_STATUS_CODES.FORBIDDEN && INVALID_LINK_MESSAGES.has(message);

    if (isInvalidLink) {
      setStatus('invalidLink');
    } else if (httpStatus === HTTP_STATUS_CODES.CONFLICT) {
      setStatus('accountAlreadyExists');
    } else {
      errorService.reportError(error);
      setHasSubmitFailed(true);
    }
  };

  const setUpAccount = async (password: string) => {
    setIsSubmitting(true);
    setHasSubmitFailed(false);

    try {
      await completeAccountSetup({ setupToken, password, dispatch });
      navigationService.push(AppView.Drive);
    } catch (error) {
      handleSetupError(error);
      setIsSubmitting(false);
    }
  };

  return { status, isSubmitting, hasSubmitFailed, setUpAccount };
};
