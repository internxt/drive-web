import { AppError } from '@internxt/sdk';
import { act, renderHook } from '@testing-library/react';
import databaseService from 'app/database/services/database.service';
import { localStorageService, RealtimeService } from 'services';
import { authenticateUser, is2FANeeded } from 'services/auth.service';
import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { AuthCheckoutProps, useAuthCheckout } from './useAuthCheckout';

vi.mock('services/auth.service', () => ({
  authenticateUser: vi.fn(),
  is2FANeeded: vi.fn(),
  default: {},
}));

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn().mockReturnValue({
    translate: vi.fn().mockImplementation((key: string) => key),
  }),
}));

const mockProfile = {
  user: {} as any,
  token: 'mock-token',
  newToken: 'mock-new-token',
  mnemonic: 'mock-mnemonic',
};

const mockedAuthenticateUserProps: Omit<AuthCheckoutProps, 'changeAuthMethod'> = {
  email: 'test@inxt.com',
  password: 'password123',
  authMethod: 'signIn',
  authCaptcha: 'token',
  dispatch: vi.fn(),
  doRegister: vi.fn(),
  onAuthenticationFail: vi.fn(),
};

const authenticateWithError = async (error: unknown, props = mockedAuthenticateUserProps) => {
  (authenticateUser as Mock).mockRejectedValue(error);

  const { result: hookState } = renderHook(() =>
    useAuthCheckout({
      changeAuthMethod: vi.fn(),
    }),
  );

  await act(async () => {
    await hookState.current.onAuthenticateUser(props);
  });

  return hookState;
};

describe('Authentication Checkout Custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (is2FANeeded as Mock).mockResolvedValue(false);
  });

  test('When the user is not logged in, then the user is logged in correctly', async () => {
    (authenticateUser as Mock).mockResolvedValue(mockProfile);

    const changeAuthMethod = vi.fn();
    const { result: hookState } = renderHook(() =>
      useAuthCheckout({
        changeAuthMethod,
      }),
    );

    await act(async () => {
      await hookState.current.onAuthenticateUser(mockedAuthenticateUserProps);
    });

    expect(authenticateUser).toHaveBeenCalledWith({
      email: mockedAuthenticateUserProps.email,
      password: mockedAuthenticateUserProps.password,
      authMethod: mockedAuthenticateUserProps.authMethod,
      twoFactorCode: '',
      dispatch: mockedAuthenticateUserProps.dispatch,
      token: mockedAuthenticateUserProps.authCaptcha,
      doSignUp: mockedAuthenticateUserProps.doRegister,
    });
    expect(hookState.current.authError).toBeNull();
    expect(mockedAuthenticateUserProps.onAuthenticationFail).not.toHaveBeenCalled();
  });

  test('When authentication succeeds, then the user object from profileInfo is returned', async () => {
    const mockUser = { id: '123', email: 'test@inxt.com' };
    (authenticateUser as Mock).mockResolvedValue({ ...mockProfile, user: mockUser });

    const changeAuthMethod = vi.fn();
    const { result: hookState } = renderHook(() =>
      useAuthCheckout({
        changeAuthMethod,
      }),
    );

    let returnedUser: any;
    await act(async () => {
      returnedUser = await hookState.current.onAuthenticateUser(mockedAuthenticateUserProps);
    });

    expect(returnedUser).toBe(mockUser);
  });

  test('When authentication fails, then undefined is returned', async () => {
    (authenticateUser as Mock).mockRejectedValue(new Error('Authentication failed'));

    const changeAuthMethod = vi.fn();
    const { result: hookState } = renderHook(() =>
      useAuthCheckout({
        changeAuthMethod,
      }),
    );

    let returnedUser: any;
    await act(async () => {
      returnedUser = await hookState.current.onAuthenticateUser(mockedAuthenticateUserProps);
    });

    expect(returnedUser).toBeUndefined();
  });

  test('When authentication fails, then the payment flow is notified so it can stop', async () => {
    await authenticateWithError(new AppError('Wrong login credentials', 401));

    expect(mockedAuthenticateUserProps.onAuthenticationFail).toHaveBeenCalled();
  });

  test('When the credentials are wrong, then the user is asked to check the email and password', async () => {
    const hookState = await authenticateWithError(new AppError('Wrong login credentials', 401));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.invalidCredentials');
  });

  test('When the account has two factor authentication enabled, then the user is asked to sign in from the login page', async () => {
    (is2FANeeded as Mock).mockResolvedValue(true);

    const hookState = await authenticateWithError(new AppError('Wrong login credentials', 401));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.twoFactorEnabled');
  });

  test('When the email already has an account, then the user is asked to log in instead of signing up', async () => {
    const hookState = await authenticateWithError(new AppError('User already registered', 409), {
      ...mockedAuthenticateUserProps,
      authMethod: 'signUp',
    });

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.emailAlreadyRegistered');
  });

  test('When the account is locked, then the user is told to unlock it before continuing', async () => {
    const hookState = await authenticateWithError(new AppError('Account blocked', 403));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.accountLocked');
  });

  test('When the login attempts are rate limited, then the user is asked to wait before retrying', async () => {
    const hookState = await authenticateWithError(new AppError('Too many requests', 429));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.tooManyAttempts');
  });

  test('When the submitted data is rejected, then the user is asked to review the email and password', async () => {
    const hookState = await authenticateWithError(new AppError('Bad request', 400));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.invalidData');
  });

  test('When the server fails, then the user is asked to retry later instead of blaming the credentials', async () => {
    const hookState = await authenticateWithError(new AppError('Internal server error', 500));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.serverError');
  });

  test('When the request never reaches the server, then the user is asked to retry later', async () => {
    const hookState = await authenticateWithError(new Error('Network Error'));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.serverError');
  });

  test('When the failure reason is not recognised, then a generic message is shown', async () => {
    const hookState = await authenticateWithError(new AppError('Unexpected', 418));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.unknown');
  });

  test('When the request fails, then the raw provider error is never shown to the user', async () => {
    const hookState = await authenticateWithError(new AppError('Request failed with status code 401', 401));

    expect(hookState.current.authError).not.toContain('status code');
  });

  test('When two factor authentication cannot be checked, then the wrong credentials message is shown', async () => {
    (is2FANeeded as Mock).mockRejectedValue(new Error('Service unavailable'));

    const hookState = await authenticateWithError(new AppError('Wrong login credentials', 401));

    expect(hookState.current.authError).toBe('checkout.authComponent.authError.invalidCredentials');
  });

  test('When the failure is not an unauthorized sign in, then the two factor status is not requested', async () => {
    await authenticateWithError(new AppError('Internal server error', 500));

    expect(is2FANeeded).not.toHaveBeenCalled();
  });

  test('When the user wants to log out, then all services are cleared and the auth method is set to ‘sign up’', async () => {
    const changeAuthMethod = vi.fn();

    const stopRealTimeServiceSpy = vi.spyOn(RealtimeService.prototype, 'stop').mockResolvedValue();
    const clearLocalServiceSpy = vi.spyOn(localStorageService, 'clear').mockReturnValue();
    const clearDatabaseSpy = vi.spyOn(databaseService, 'clear').mockResolvedValue();

    const { result: hookState } = renderHook(() =>
      useAuthCheckout({
        changeAuthMethod,
      }),
    );

    await act(async () => {
      await hookState.current.onLogOut();
    });

    expect(clearDatabaseSpy).toHaveBeenCalled();
    expect(clearLocalServiceSpy).toHaveBeenCalled();
    expect(stopRealTimeServiceSpy).toHaveBeenCalled();
    expect(changeAuthMethod).toHaveBeenCalledWith('signUp');
  });

  test('When signing up a new user, then the user is signed up correctly', async () => {
    vi.mocked(authenticateUser).mockResolvedValue(mockProfile);

    const changeAuthMethod = vi.fn();
    const { result: hookState } = renderHook(() =>
      useAuthCheckout({
        changeAuthMethod,
      }),
    );

    const signUpProps = {
      ...mockedAuthenticateUserProps,
      authMethod: 'signUp' as const,
    };

    await act(async () => {
      await hookState.current.onAuthenticateUser(signUpProps);
    });

    expect(authenticateUser).toHaveBeenCalledWith({
      email: signUpProps.email,
      password: signUpProps.password,
      authMethod: 'signUp',
      twoFactorCode: '',
      dispatch: signUpProps.dispatch,
      token: signUpProps.authCaptcha,
      doSignUp: signUpProps.doRegister,
    });
    expect(hookState.current.authError).toBeNull();
  });
});
