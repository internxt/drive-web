import { describe, expect, test, vi, beforeEach, Mock } from 'vitest';
import { AuthCheckoutProps, useAuthCheckout } from './useAuthCheckout';
import { act, renderHook } from '@testing-library/react';
import { authenticateUser } from 'services/auth.service';
import databaseService from 'app/database/services/database.service';
import { localStorageService, RealtimeService } from 'services';

vi.mock('services/auth.service', () => ({
  authenticateUser: vi.fn(),
  default: {},
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

describe('Authentication Checkout Custom hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When the user is not logged in, then the user is logged in correctly', async () => {
    (authenticateUser as Mock).mockResolvedValue(undefined);

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
    expect(hookState.current.authError).toBeUndefined();
    expect(mockedAuthenticateUserProps.onAuthenticationFail).not.toHaveBeenCalled();
  });

  test('When authentication fails, then the error is set and the error is handled correctly', async () => {
    const errorMessage = 'Authentication failed';
    (authenticateUser as Mock).mockRejectedValue(new Error(errorMessage));

    const changeAuthMethod = vi.fn();
    const { result: hookState } = renderHook(() =>
      useAuthCheckout({
        changeAuthMethod,
      }),
    );

    await act(async () => {
      await hookState.current.onAuthenticateUser(mockedAuthenticateUserProps);
    });

    expect(hookState.current.authError).toBe(errorMessage);
    expect(mockedAuthenticateUserProps.onAuthenticationFail).toHaveBeenCalled();
  });

  test("When the user wants to log out, then all services are cleared and the auth method is set to 'sign up'", async () => {
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
    expect(hookState.current.authError).toBeUndefined();
  });
});
