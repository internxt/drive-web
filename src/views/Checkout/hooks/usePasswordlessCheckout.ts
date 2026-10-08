import { useState } from 'react';
import { CreateCustomerWithoutAccountPayload, CreatedCustomer } from '@internxt/sdk/dist/payments/types';
import { LocalStorageItem } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { isAccountSetupPending } from 'services/account-setup.service';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import { STATUS_CODE_ERROR } from '../constants';
import { checkoutService } from '../services';
import { AuthMethodTypes } from '../types';

interface UsePasswordlessCheckoutProps {
  authMethod: AuthMethodTypes;
  onEmailAlreadyHasAccount: () => void;
}

export const usePasswordlessCheckout = ({ authMethod, onEmailAlreadyHasAccount }: UsePasswordlessCheckoutProps) => {
  const { translate } = useTranslationContext();
  const [pendingAccountSetupEmail, setPendingAccountSetupEmail] = useState<string>();

  const isPasswordlessSignUp = authMethod === 'signUp';

  const createCustomerWithoutAccount = async (
    payload: CreateCustomerWithoutAccountPayload,
  ): Promise<CreatedCustomer> => {
    setPendingAccountSetupEmail(undefined);
    const email = payload.email.trim().toLowerCase();

    const customer = await checkoutService.createCustomerWithoutAccount({ ...payload, email });
    localStorageService.set(LocalStorageItem.CheckoutAccountSetupEmail, email);

    return customer;
  };

  const forgetAccountSetupEmail = () => localStorageService.removeItem(LocalStorageItem.CheckoutAccountSetupEmail);

  /**
   * Handles the answers that only a purchase without account can get. Returns false for any other error,
   * which the caller handles as in the regular checkout.
   */
  const handlePasswordlessPurchaseError = (error: unknown, email: string): boolean => {
    if (isAccountSetupPending(error)) {
      setPendingAccountSetupEmail(email.trim().toLowerCase());
      return true;
    }

    const { status } = errorService.castError(error);

    if (status === STATUS_CODE_ERROR.USER_EXISTS) {
      onEmailAlreadyHasAccount();
      return true;
    }

    if (status === STATUS_CODE_ERROR.FORBIDDEN) {
      notificationsService.show({
        text: translate('notificationMessages.errorCreatingSubscription'),
        type: ToastType.Error,
      });
      return true;
    }

    return false;
  };

  return {
    isPasswordlessSignUp,
    pendingAccountSetupEmail,
    createCustomerWithoutAccount,
    forgetAccountSetupEmail,
    handlePasswordlessPurchaseError,
  };
};
