import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { SdkFactory } from 'app/core/factory/sdk';
import { IFormValues } from 'app/core/types';
import enTranslations from 'app/i18n/locales/en.json';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthMethodTypes } from '../types';
import { CheckoutUserAuth } from './CheckoutUserAuth';

const translate = (key: string, props?: Record<string, unknown>) => {
  const value = key.split('.').reduce<unknown>((accumulator, part) => accumulator?.[part], enTranslations);

  if (typeof value !== 'string') {
    throw new Error(`Missing translation for "${key}"`);
  }

  return value.replace(/{{(\w+)}}/g, (_, placeholder) => String(props?.[placeholder] ?? ''));
};

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate }),
}));

const resendAccountSetupEmail = vi.fn();

interface RenderOptions {
  authMethod?: AuthMethodTypes;
  isPasswordlessSignUp?: boolean;
  pendingAccountSetupEmail?: string;
}

const CheckoutUserAuthForm = ({
  authMethod = 'signUp',
  isPasswordlessSignUp,
  pendingAccountSetupEmail,
}: RenderOptions) => {
  const {
    register,
    formState: { errors },
  } = useForm<IFormValues>();

  return (
    <CheckoutUserAuth
      register={register}
      errors={errors}
      authMethod={authMethod}
      isPasswordlessSignUp={isPasswordlessSignUp}
      pendingAccountSetupEmail={pendingAccountSetupEmail}
      onAuthMethodToggled={vi.fn()}
      onLogOut={vi.fn()}
      userData={{ name: '', avatar: null }}
    />
  );
};

describe('Checkout account details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.grecaptcha = {
      ready: (callback: () => void) => callback(),
      execute: vi.fn().mockResolvedValue('captcha_token'),
    } as unknown as typeof globalThis.grecaptcha;
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: () => ({ resendAccountSetupEmail }),
    } as unknown as SdkFactory);
  });

  test('When a new buyer can pay without a password, then only the email is asked', () => {
    render(<CheckoutUserAuthForm isPasswordlessSignUp />);

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
    expect(screen.getByText(enTranslations.checkout.accountSetup.passwordAfterPayment)).toBeInTheDocument();
  });

  test('When paying without a password is not available, then a new buyer is asked for a password', () => {
    render(<CheckoutUserAuthForm />);

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  test('When the buyer logs in inside the checkout, then the password is still asked', () => {
    render(<CheckoutUserAuthForm authMethod="signIn" />);

    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  test('When the email has a paid account waiting to be set up, then the buyer can ask for the setup email again', async () => {
    const showNotificationSpy = vi.spyOn(notificationsService, 'show').mockReturnValue('');
    resendAccountSetupEmail.mockResolvedValue(undefined);
    render(<CheckoutUserAuthForm isPasswordlessSignUp pendingAccountSetupEmail="pending@internxt.com" />);

    expect(screen.getByText(/pending@internxt.com already has a paid plan waiting to be set up/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: enTranslations.checkout.accountSetup.resendEmail }));

    await waitFor(() =>
      expect(showNotificationSpy).toHaveBeenCalledWith({
        text: enTranslations.checkout.accountSetup.emailResent,
        type: ToastType.Success,
      }),
    );
    expect(resendAccountSetupEmail).toHaveBeenCalledWith('pending@internxt.com');
  });

  test('When the setup email cannot be sent again, then the buyer is told to try later', async () => {
    const showNotificationSpy = vi.spyOn(notificationsService, 'show').mockReturnValue('');
    resendAccountSetupEmail.mockRejectedValue(new Error('Network error'));
    render(<CheckoutUserAuthForm isPasswordlessSignUp pendingAccountSetupEmail="pending@internxt.com" />);

    fireEvent.click(screen.getByRole('button', { name: enTranslations.checkout.accountSetup.resendEmail }));

    await waitFor(() =>
      expect(showNotificationSpy).toHaveBeenCalledWith({
        text: enTranslations.checkout.accountSetup.resendEmailError,
        type: ToastType.Error,
      }),
    );
  });
});
