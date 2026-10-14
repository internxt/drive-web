import { CompleteAccountSetupPayload } from '@internxt/sdk/dist/auth/types';
import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppView } from 'app/core/types';
import { planThunks } from 'app/store/slices/plan';
import { Buffer } from 'node:buffer';
import { MemoryRouter, Route } from 'react-router-dom';
import envService from 'services/env.service';
import navigationService from 'services/navigation.service';
import { getCompleteAccountSetupResponse } from 'testUtils/fixtures/accountSetup.fixtures';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AccountSetupView from './AccountSetupView';

const { authClient } = vi.hoisted(() => ({
  authClient: { completeAccountSetup: vi.fn(), resendAccountSetupEmail: vi.fn() },
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: () => ({ createAuthClient: () => authClient }) },
}));
vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));
vi.mock('app/store/hooks', () => ({ useAppDispatch: () => vi.fn() }));
vi.mock('services/navigation.service', () => ({ default: { push: vi.fn(), isCurrentPath: vi.fn() } }));
vi.mock('services/encrypted-storage.service', () => ({
  default: { setToken: vi.fn(), getToken: vi.fn(), getUser: vi.fn(), clear: vi.fn() },
}));
vi.mock('services/local-storage.service', () => ({
  default: { get: vi.fn(), set: vi.fn(), clear: vi.fn(), clearExcept: vi.fn() },
}));
vi.mock('app/store/slices/user', () => ({
  initializeUserThunk: vi.fn(),
  userThunks: { setUserThunk: vi.fn(), initializeUserThunk: vi.fn() },
}));
vi.mock('app/store/slices/plan', () => ({ planThunks: { initializeThunk: vi.fn() } }));
vi.mock('app/store/slices/workspaces/workspacesStore', () => ({
  workspaceThunks: { fetchWorkspaces: vi.fn(), checkAndSetLocalWorkspace: vi.fn() },
}));
vi.mock('app/analytics/impact.service', () => ({ trackSignUp: vi.fn() }));
vi.mock('app/analytics/meta.service', () => ({ trackLead: vi.fn() }));

const SETUP_TOKEN = 'setup-token-from-email';
const STRONG_PASSWORD = 'Correct-Horse-Battery-9!';

const backendError = (status: number, message: string) =>
  new AxiosResponseError(message, 'POST /users/pre-created-users/complete-setup', {
    status,
    data: { message },
    headers: {},
  } as never);

const renderSetupLink = () =>
  render(
    <MemoryRouter initialEntries={[`/complete-account/${SETUP_TOKEN}`]}>
      <Route path="/complete-account/:token">
        <AccountSetupView />
      </Route>
    </MemoryRouter>,
  );

const typePasswords = (password: string, confirmation: string) => {
  const passwordField = screen.getByPlaceholderText('auth.password');
  fireEvent.focus(passwordField);
  fireEvent.change(passwordField, { target: { value: password } });
  fireEvent.change(screen.getByPlaceholderText('accountSetup.form.confirmPassword'), {
    target: { value: confirmation },
  });
};

const submitButton = () => screen.getByRole('button', { name: 'accountSetup.form.submit' });

const submitPassword = async (password = STRONG_PASSWORD) => {
  typePasswords(password, password);
  await waitFor(() => expect(submitButton()).toBeEnabled());
  fireEvent.click(submitButton());
};

describe('Account setup from the email link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.Buffer = Buffer;
    globalThis.grecaptcha = { ready: (callback: () => void) => callback(), execute: async () => 'captcha' } as never;
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => (key === 'secret' ? 'crypto-secret' : 'value'));
    authClient.completeAccountSetup.mockImplementation(async (payload: CompleteAccountSetupPayload) =>
      getCompleteAccountSetupResponse(payload),
    );
    authClient.resendAccountSetupEmail.mockResolvedValue(undefined);
  });

  test('When the user sets and confirms a valid password, then they land in Drive with their plan loaded', async () => {
    renderSetupLink();

    await submitPassword();

    await waitFor(() => expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive));
    expect(authClient.completeAccountSetup).toHaveBeenCalledWith(expect.objectContaining({ token: SETUP_TOKEN }));
    expect(planThunks.initializeThunk).toHaveBeenCalled();
  });

  test('When the confirmation does not match the password, then the form warns and cannot be submitted', async () => {
    renderSetupLink();

    typePasswords(STRONG_PASSWORD, `${STRONG_PASSWORD}x`);

    expect(await screen.findByText('accountSetup.form.passwordsDoNotMatch')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    fireEvent.submit(submitButton().closest('form') as HTMLFormElement);
    expect(authClient.completeAccountSetup).not.toHaveBeenCalled();
  });

  test('When the password does not meet the requirements, then the form cannot be submitted', async () => {
    renderSetupLink();

    typePasswords('short', 'short');

    expect(await screen.findByText('Password has to be at least 8 characters long')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    fireEvent.submit(submitButton().closest('form') as HTMLFormElement);
    expect(authClient.completeAccountSetup).not.toHaveBeenCalled();
  });

  test('When the link has expired, then the user is told it is no longer valid and can ask for a new one', async () => {
    authClient.completeAccountSetup.mockRejectedValue(backendError(403, 'Token expired'));
    renderSetupLink();

    await submitPassword();
    expect(await screen.findByText('accountSetup.invalidLink.title')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Paid-User@Internxt.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'accountSetup.invalidLink.resendButton' }));

    expect(await screen.findByText('accountSetup.invalidLink.emailSentTitle')).toBeInTheDocument();
    expect(authClient.resendAccountSetupEmail).toHaveBeenCalledWith('paid-user@internxt.com');
  });

  test('When the link was already used, then the user is told it is no longer valid', async () => {
    authClient.completeAccountSetup.mockRejectedValue(backendError(403, 'Invalid token'));
    renderSetupLink();

    await submitPassword();

    expect(await screen.findByText('accountSetup.invalidLink.title')).toBeInTheDocument();
    expect(navigationService.push).not.toHaveBeenCalled();
  });

  test('When the captcha is rejected, then the user sees a generic error instead of an invalid link', async () => {
    authClient.completeAccountSetup.mockRejectedValue(backendError(403, 'Forbidden resource'));
    renderSetupLink();

    await submitPassword();

    expect(await screen.findByText('accountSetup.form.genericError')).toBeInTheDocument();
    expect(screen.queryByText('accountSetup.invalidLink.title')).not.toBeInTheDocument();
  });

  test('When the account already exists, then the user is offered to go to log in', async () => {
    authClient.completeAccountSetup.mockRejectedValue(backendError(409, 'User already registered'));
    renderSetupLink();

    await submitPassword();
    fireEvent.click(await screen.findByRole('button', { name: 'accountSetup.accountAlreadyExists.loginButton' }));

    expect(navigationService.push).toHaveBeenCalledWith(AppView.Login);
  });

  test('When the setup fails for another reason, then a generic error is shown and the user can retry', async () => {
    authClient.completeAccountSetup.mockRejectedValueOnce(backendError(500, 'Internal Server Error'));
    renderSetupLink();

    await submitPassword();

    expect(await screen.findByText('accountSetup.form.genericError')).toBeInTheDocument();
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());
    await waitFor(() => expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive));
  });
});
