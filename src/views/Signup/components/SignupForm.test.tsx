import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import { SdkFactory } from 'app/core/factory/sdk';
import envService from 'services/env.service';
import SignUpForm from './SignupForm';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

vi.mock('react-helmet-async', () => ({
  Helmet: () => null,
}));

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: vi.fn() },
}));

const PENDING_EMAIL = 'pending@example.com';
const STRONG_PASSWORD = 'Str0ng-Passw0rd-For-Tests!';

const backendError = (status: number, data: Record<string, unknown>) =>
  new AxiosResponseError('Request failed', '', { status, data, headers: {} } as never);

const mockRegisterFailure = (error: unknown, resendAccountSetupEmail = vi.fn()) => {
  vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
    createAuthClient: () => ({ register: vi.fn().mockRejectedValue(error), resendAccountSetupEmail }),
  } as unknown as ReturnType<typeof SdkFactory.getNewApiInstance>);
};

const submitSignup = async (container: HTMLElement, email: string) => {
  fireEvent.change(container.querySelector('input[name="email"]') as HTMLInputElement, { target: { value: email } });
  fireEvent.change(container.querySelector('input[name="password"]') as HTMLInputElement, {
    target: { value: STRONG_PASSWORD },
  });
  const createAccountButton = await screen.findByRole('button', { name: 'auth.signup.title' });
  await vi.waitFor(() => expect(createAccountButton).toBeEnabled());
  fireEvent.click(createAccountButton);
};

const renderSignup = () =>
  render(
    <MemoryRouter>
      <SignUpForm />
    </MemoryRouter>,
  );

describe('Sign up', () => {
  beforeEach(() => {
    globalThis.history.replaceState({}, '', '/new');
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => (key === 'secret' ? 'test-secret' : ''));
    globalThis.grecaptcha = {
      ready: (callback: () => void) => callback(),
      execute: async () => 'captcha-token',
    } as unknown as typeof globalThis.grecaptcha;
  });

  test('When the email already has a paid account waiting to be set up, then the user is asked to finish the setup instead of seeing an error', async () => {
    mockRegisterFailure(backendError(403, { message: 'Account setup pending', code: 'AccountSetupPending' }));
    const { container } = renderSignup();

    await submitSignup(container, PENDING_EMAIL);

    expect(await screen.findByText('auth.accountSetupPending.title')).toBeInTheDocument();
    expect(screen.queryByText('Account setup pending')).not.toBeInTheDocument();
  });

  test('When the user resends the setup email from the sign up, then a confirmation is shown', async () => {
    const resendAccountSetupEmail = vi.fn().mockResolvedValue(undefined);
    mockRegisterFailure(
      backendError(403, { message: 'Account setup pending', code: 'AccountSetupPending' }),
      resendAccountSetupEmail,
    );
    const { container } = renderSignup();
    await submitSignup(container, PENDING_EMAIL);

    fireEvent.click(await screen.findByRole('button', { name: 'auth.accountSetupPending.resend' }));

    expect(await screen.findByRole('status')).toHaveTextContent('auth.accountSetupPending.emailSent');
    expect(resendAccountSetupEmail).toHaveBeenCalledWith(PENDING_EMAIL);
  });

  test('When the sign up fails for any other reason, then the usual error is shown and no setup message appears', async () => {
    mockRegisterFailure(backendError(409, { message: 'This email is already in use' }));
    const { container } = renderSignup();

    await submitSignup(container, 'user@example.com');

    expect(await screen.findByText('This email is already in use')).toBeInTheDocument();
    expect(screen.queryByText('auth.accountSetupPending.title')).not.toBeInTheDocument();
  });
});
