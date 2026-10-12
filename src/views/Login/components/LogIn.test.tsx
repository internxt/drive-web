import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import { SdkFactory } from 'app/core/factory/sdk';
import LogIn from './LogIn';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

vi.mock('react-helmet-async', () => ({
  Helmet: () => null,
}));

vi.mock('react-redux', async () => {
  const actual = await vi.importActual<typeof import('react-redux')>('react-redux');
  return {
    ...actual,
    useSelector: (selector: (state: unknown) => unknown) => selector({ user: { user: undefined } }),
  };
});

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: vi.fn() },
}));

const PENDING_EMAIL = 'pending@example.com';
const PASSWORD = 'SomePassword123!';

const backendError = (status: number, data: Record<string, unknown>) =>
  new AxiosResponseError('Request failed', '', { status, data, headers: {} } as never);

const mockAuthBackend = (authClient: Record<string, unknown>) => {
  vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
    createAuthClient: () => authClient,
    createDesktopAuthClient: () => authClient,
  } as unknown as ReturnType<typeof SdkFactory.getNewApiInstance>);
};

const submitCredentials = (container: HTMLElement, email: string) => {
  fireEvent.change(container.querySelector('input[name="email"]') as HTMLInputElement, { target: { value: email } });
  fireEvent.change(container.querySelector('input[name="password"]') as HTMLInputElement, {
    target: { value: PASSWORD },
  });
  fireEvent.click(screen.getByRole('button', { name: 'auth.button.loginAction' }));
};

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LogIn />
    </MemoryRouter>,
  );

describe('Login', () => {
  beforeEach(() => {
    globalThis.history.replaceState({}, '', '/login');
    globalThis.grecaptcha = {
      ready: (callback: () => void) => callback(),
      execute: async () => 'captcha-token',
    } as unknown as typeof globalThis.grecaptcha;
  });

  test('When the email has a paid account whose setup is not finished, then the user is asked to finish the setup instead of seeing an error', async () => {
    mockAuthBackend({
      securityDetails: vi
        .fn()
        .mockRejectedValue(backendError(403, { message: 'Account setup pending', code: 'AccountSetupPending' })),
    });
    const { container } = renderLogin();

    submitCredentials(container, PENDING_EMAIL);

    expect(await screen.findByText('auth.accountSetupPending.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'auth.accountSetupPending.resend' })).toBeInTheDocument();
    expect(screen.queryByText('Account setup pending')).not.toBeInTheDocument();
  });

  test('When the user resends the setup email from the login, then a confirmation is shown', async () => {
    const resendAccountSetupEmail = vi.fn().mockResolvedValue(undefined);
    mockAuthBackend({
      securityDetails: vi
        .fn()
        .mockRejectedValue(backendError(403, { message: 'Account setup pending', code: 'AccountSetupPending' })),
      resendAccountSetupEmail,
    });
    const { container } = renderLogin();
    submitCredentials(container, PENDING_EMAIL);

    fireEvent.click(await screen.findByRole('button', { name: 'auth.accountSetupPending.resend' }));

    expect(await screen.findByRole('status')).toHaveTextContent('auth.accountSetupPending.emailSent');
    expect(resendAccountSetupEmail).toHaveBeenCalledWith(PENDING_EMAIL);
  });

  test('When the credentials are wrong, then the usual error is shown and no setup message appears', async () => {
    mockAuthBackend({
      securityDetails: vi.fn().mockResolvedValue({ tfaEnabled: false, encryptedSalt: 'encrypted-salt' }),
      login: vi.fn().mockRejectedValue(backendError(401, { error: 'Wrong login credentials' })),
    });
    const { container } = renderLogin();

    submitCredentials(container, 'user@example.com');

    expect(await screen.findByText('Wrong login credentials')).toBeInTheDocument();
    expect(screen.queryByText('auth.accountSetupPending.title')).not.toBeInTheDocument();
  });
});
