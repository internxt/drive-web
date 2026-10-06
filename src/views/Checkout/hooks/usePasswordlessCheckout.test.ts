import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import { CreateCustomerWithoutAccountPayload } from '@internxt/sdk/dist/payments/types';
import { act, renderHook } from '@testing-library/react';
import { SdkFactory } from 'app/core/factory/sdk';
import { LocalStorageItem } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import localStorageService from 'services/local-storage.service';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthMethodTypes } from '../types';
import { usePasswordlessCheckout } from './usePasswordlessCheckout';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

const createCustomerWithoutAccount = vi.fn();

const customerPayload: CreateCustomerWithoutAccountPayload = {
  email: ' New.Buyer@Internxt.com ',
  confirmationTokenId: 'ctoken_123',
  country: 'ES',
  captchaToken: 'captcha_token',
};

const responseError = (status: number, data: Record<string, unknown> = {}) =>
  new AxiosResponseError('Request failed', 'POST /checkout/customer', { status, data, headers: {} } as never);

const renderPasswordlessCheckout = ({
  authMethod = 'signUp' as AuthMethodTypes,
  isUrgentCheckout = false,
  onEmailAlreadyHasAccount = vi.fn(),
} = {}) => renderHook(() => usePasswordlessCheckout({ authMethod, isUrgentCheckout, onEmailAlreadyHasAccount }));

describe('Paying without creating a password first', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createCheckoutClientWithoutSession: () => ({ createCustomerWithoutAccount }),
    } as unknown as SdkFactory);
    createCustomerWithoutAccount.mockResolvedValue({ customerId: 'cus_123', token: 'payments_token' });
  });

  test('When a new buyer is creating an account, then the checkout asks only for the email', () => {
    const { result } = renderPasswordlessCheckout();

    expect(result.current.isPasswordlessSignUp).toBe(true);
  });

  test('When the buyer chooses to log in, then the checkout keeps asking for the password', () => {
    const { result } = renderPasswordlessCheckout({ authMethod: 'signIn' });

    expect(result.current.isPasswordlessSignUp).toBe(false);
  });

  test('When the buyer is in the urgent checkout, then the new account keeps being created with a password', () => {
    const { result } = renderPasswordlessCheckout({ isUrgentCheckout: true });

    expect(result.current.isPasswordlessSignUp).toBe(false);
  });

  test('When the customer is created for the new buyer, then the payment can continue and the email is kept for the success screen', async () => {
    const { result } = renderPasswordlessCheckout();

    const customer = await result.current.createCustomerWithoutAccount(customerPayload);

    expect(customer).toStrictEqual({ customerId: 'cus_123', token: 'payments_token' });
    expect(createCustomerWithoutAccount).toHaveBeenCalledWith({ ...customerPayload, email: 'new.buyer@internxt.com' });
    expect(localStorageService.get(LocalStorageItem.CheckoutAccountSetupEmail)).toBe('new.buyer@internxt.com');
  });

  test('When the customer cannot be created, then no email is kept for the success screen', async () => {
    createCustomerWithoutAccount.mockRejectedValue(responseError(403));
    const { result } = renderPasswordlessCheckout();

    await expect(result.current.createCustomerWithoutAccount(customerPayload)).rejects.toThrow();

    expect(localStorageService.get(LocalStorageItem.CheckoutAccountSetupEmail)).toBeNull();
  });

  test('When the email already has an account, then the buyer is sent to log in', () => {
    const onEmailAlreadyHasAccount = vi.fn();
    const { result } = renderPasswordlessCheckout({ onEmailAlreadyHasAccount });

    const isHandled = result.current.handlePasswordlessPurchaseError(responseError(409), customerPayload.email);

    expect(isHandled).toBe(true);
    expect(onEmailAlreadyHasAccount).toHaveBeenCalled();
    expect(result.current.pendingAccountSetupEmail).toBeUndefined();
  });

  test('When the email already paid and its account setup is pending, then the buyer is asked to finish it from the email', () => {
    const onEmailAlreadyHasAccount = vi.fn();
    const { result } = renderPasswordlessCheckout({ onEmailAlreadyHasAccount });

    act(() => {
      result.current.handlePasswordlessPurchaseError(
        responseError(409, { code: 'AccountSetupPending' }),
        customerPayload.email,
      );
    });

    expect(result.current.pendingAccountSetupEmail).toBe('new.buyer@internxt.com');
    expect(onEmailAlreadyHasAccount).not.toHaveBeenCalled();
  });

  test('When the payment details are rejected, then a generic error is shown so the buyer can try again', () => {
    const showNotificationSpy = vi.spyOn(notificationsService, 'show').mockReturnValue('');
    const { result } = renderPasswordlessCheckout();

    const isHandled = result.current.handlePasswordlessPurchaseError(responseError(403), customerPayload.email);

    expect(isHandled).toBe(true);
    expect(showNotificationSpy).toHaveBeenCalledWith({
      text: 'notificationMessages.errorCreatingSubscription',
      type: ToastType.Error,
    });
  });

  test('When the payment fails for any other reason, then the regular checkout error is shown instead', () => {
    const onEmailAlreadyHasAccount = vi.fn();
    const { result } = renderPasswordlessCheckout({ onEmailAlreadyHasAccount });

    const isHandled = result.current.handlePasswordlessPurchaseError(
      new Error('Your card was declined'),
      customerPayload.email,
    );

    expect(isHandled).toBe(false);
    expect(onEmailAlreadyHasAccount).not.toHaveBeenCalled();
  });
});
