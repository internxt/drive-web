import { describe, it, expect, vi, beforeEach } from 'vitest';
import authCheckoutService from './auth-checkout.service';
import * as authService from 'services/auth.service';

vi.mock('services/auth.service', () => ({
  logIn: vi.fn(),
  signUp: vi.fn(),
}));

describe('authCheckoutService', () => {
  const mockDispatch = vi.fn();
  const mockDoRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('authenticates existing user with credentials', async () => {
      await authCheckoutService.authenticateUser({
        email: 'user@example.com',
        password: 'password123',
        authMethod: 'signIn',
        captcha: 'captcha_token',
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
      });

      expect(authService.logIn).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
        twoFactorCode: '',
        dispatch: mockDispatch,
      });
      expect(authService.signUp).not.toHaveBeenCalled();
    });

    it('creates new user account', async () => {
      await authCheckoutService.authenticateUser({
        email: 'newuser@example.com',
        password: 'password123',
        authMethod: 'signUp',
        captcha: 'captcha_token',
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
      });

      expect(authService.signUp).toHaveBeenCalledWith({
        doSignUp: mockDoRegister,
        email: 'newuser@example.com',
        password: 'password123',
        token: 'captcha_token',
        redeemCodeObject: false,
        dispatch: mockDispatch,
      });
      expect(authService.logIn).not.toHaveBeenCalled();
    });

    it('does nothing for already signed in users', async () => {
      await authCheckoutService.authenticateUser({
        email: 'user@example.com',
        password: 'password123',
        authMethod: 'userIsSignedIn',
        captcha: 'captcha_token',
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
      });

      expect(authService.logIn).not.toHaveBeenCalled();
      expect(authService.signUp).not.toHaveBeenCalled();
    });
  });
});
