import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { submitBlogSignup } from './blogSignup.service';
import { authenticateUser } from 'services/auth.service';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import { AppDispatch } from 'app/store';
import AppError from 'app/core/types';

vi.mock('services/auth.service', () => ({
  authenticateUser: vi.fn(),
}));

vi.mock('services/env.service', () => ({
  default: {
    getVariable: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn(),
    reportError: vi.fn(),
  },
}));

describe('submitBlogSignup', () => {
  let mockDispatch: AppDispatch;
  let mockDoRegister: Mock;
  let mockSetLoading: Mock;
  let mockSetError: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch = vi.fn() as unknown as AppDispatch;
    mockDoRegister = vi.fn();
    mockSetLoading = vi.fn();
    mockSetError = vi.fn();

    vi.spyOn(globalThis, 'open' as any).mockImplementation(vi.fn());

    globalThis.gtag = vi.fn() as any;

    vi.spyOn(Storage.prototype, 'removeItem');

    (envService.getVariable as Mock).mockReturnValue('https://drive.internxt.com');
  });

  describe('Validation', () => {
    it('when credentials are missing, then signup should not proceed', async () => {
      await submitBlogSignup({
        data: { email: null, password: 'password123' },
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
        setLoading: mockSetLoading,
      });

      expect(mockSetLoading).toHaveBeenCalledWith(false);
      expect(authenticateUser).not.toHaveBeenCalled();
    });
  });

  describe('Successful signup', () => {
    it('when signup succeeds with redirect enabled, then user should be redirected to app', async () => {
      const mockOpen = vi.fn();
      globalThis.open = mockOpen;
      (authenticateUser as Mock).mockResolvedValue(undefined);

      await submitBlogSignup({
        data: { email: 'test@example.com', password: 'password123' },
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
        setLoading: mockSetLoading,
        redirectToApp: true,
      });

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(authenticateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        authMethod: 'signUp',
        twoFactorCode: '',
        dispatch: mockDispatch,
        token: '',
        redeemCodeObject: false,
        doSignUp: mockDoRegister,
      });
      expect(globalThis.gtag).toHaveBeenCalledWith('event', 'User Signup', { send_to: 'Blog' });
      expect(localStorage.removeItem).toHaveBeenCalledWith('email');
      expect(localStorage.removeItem).toHaveBeenCalledWith('password');
      expect(mockOpen).toHaveBeenCalledWith('https://drive.internxt.com', '_parent', 'noopener');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('when signup succeeds with redirect disabled, then user should stay on current page', async () => {
      const mockOpen = vi.fn();
      globalThis.open = mockOpen;
      (authenticateUser as Mock).mockResolvedValue(undefined);

      await submitBlogSignup({
        data: { email: 'test@example.com', password: 'password123' },
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
        setLoading: mockSetLoading,
        redirectToApp: false,
      });

      expect(authenticateUser).toHaveBeenCalled();
      expect(mockOpen).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('when a token is provided, then it should be included in the signup request', async () => {
      (authenticateUser as Mock).mockResolvedValue(undefined);

      await submitBlogSignup({
        data: { email: 'test@example.com', password: 'password123', token: 'test-token' },
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
        setLoading: mockSetLoading,
        redirectToApp: false,
      });

      expect(authenticateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
        }),
      );
    });
  });

  describe('Error handling', () => {
    it('when signup fails and error handler is provided, then error should be displayed to user', async () => {
      const mockError = new AppError('Authentication failed');
      (authenticateUser as Mock).mockRejectedValue(mockError);
      (errorService.castError as Mock).mockReturnValue(mockError);

      await submitBlogSignup({
        data: { email: 'test@example.com', password: 'wrongpassword' },
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
        setLoading: mockSetLoading,
        setError: mockSetError,
      });

      expect(errorService.castError).toHaveBeenCalledWith(mockError);
      expect(mockSetError).toHaveBeenCalledWith('Authentication failed');
      expect(errorService.reportError).not.toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('when signup fails without error handler, then error should be reported', async () => {
      const mockError = new Error('Network error');
      (authenticateUser as Mock).mockRejectedValue(mockError);
      (errorService.castError as Mock).mockReturnValue(new AppError('Network error'));

      await submitBlogSignup({
        data: { email: 'test@example.com', password: 'password123' },
        dispatch: mockDispatch,
        doRegister: mockDoRegister,
        setLoading: mockSetLoading,
      });

      expect(errorService.reportError).toHaveBeenCalledWith(mockError);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });
});
