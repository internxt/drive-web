/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guestSignupOnSubmit } from './guestSignupOnSubmit';
import { AppView, IFormValues } from 'app/core/types';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import { parseAndDecryptUserKeys } from 'app/crypto/services/keys.service';
import { userActions, userThunks } from 'app/store/slices/user';
import { productsThunks } from 'app/store/slices/products';
import { planThunks } from 'app/store/slices/plan';
import { referralsThunks } from 'app/store/slices/referrals';

vi.mock(import('app/core/services/error.service'));
vi.mock(import('app/core/services/local-storage.service'));
vi.mock(import('app/core/services/navigation.service'));
vi.mock(import('app/crypto/services/keys.service'));
vi.mock(import('app/store/slices/user'));
vi.mock(import('app/store/slices/products'));
vi.mock(import('app/store/slices/plan'));
vi.mock(import('app/store/slices/referrals'));

describe('guestSignupOnSubmit', () => {
  const mockDispatch = vi.fn();
  const mockSetIsLoading = vi.fn();
  const mockSetSignupError = vi.fn();
  const mockSetShowError = vi.fn();
  const mockDoRegisterPreCreatedUser = vi.fn();
  const mockEvent = { preventDefault: vi.fn() } as unknown as React.BaseSyntheticEvent;

  const mockFormData: IFormValues = {
    name: '',
    lastname: '',
    email: 'test@example.com',
    password: 'password123',
    lastPassword: '',
    currentPassword: '',
    twoFactorCode: '',
    confirmPassword: '',
    acceptTerms: false,
    backupKey: '',
    createFolder: '',
    teamMembers: 0,
    token: 'recaptcha-token',
    userRole: '',
    companyName: '',
    companyVatId: '',
  };

  const mockRegistrationResponse = {
    xUser: {
      uuid: 'user-uuid',
      email: 'test@example.com',
    },
    xToken: 'access-token',
    xNewToken: 'refresh-token',
    mnemonic: 'test mnemonic',
  };

  const mockParsedKeys = {
    publicKey: 'public-key',
    privateKey: 'private-key',
    publicKyberKey: 'public-kyber-key',
    privateKyberKey: 'private-kyber-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockResolvedValue(undefined);
    vi.mocked(parseAndDecryptUserKeys).mockReturnValue(mockParsedKeys);
    vi.mocked(userThunks.initializeUserThunk).mockReturnValue({} as any);
    vi.mocked(productsThunks.initializeThunk).mockReturnValue({} as any);
    vi.mocked(planThunks.initializeThunk).mockReturnValue({} as any);
    vi.mocked(referralsThunks.initializeThunk).mockReturnValue({} as any);
  });

  it('should successfully register user and navigate to redirect page', async () => {
    mockDoRegisterPreCreatedUser.mockResolvedValue(mockRegistrationResponse);

    await guestSignupOnSubmit({
      formData: mockFormData,
      event: mockEvent,
      invitationId: 'invite-123',
      doRegisterPreCreatedUser: mockDoRegisterPreCreatedUser,
      dispatch: mockDispatch,
      setIsLoading: mockSetIsLoading,
      setSignupError: mockSetSignupError,
      setShowError: mockSetShowError,
      redirectTo: AppView.Drive,
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockDoRegisterPreCreatedUser).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      'invite-123',
      'recaptcha-token',
    );
    expect(localStorageService.clear).toHaveBeenCalled();
    expect(localStorageService.set).toHaveBeenCalledWith('xToken', 'access-token');
    expect(localStorageService.set).toHaveBeenCalledWith('xMnemonic', 'test mnemonic');
    expect(localStorageService.set).toHaveBeenCalledWith('xNewToken', 'refresh-token');
    expect(parseAndDecryptUserKeys).toHaveBeenCalledWith(mockRegistrationResponse.xUser, 'password123');
    expect(mockDispatch).toHaveBeenCalledWith(userActions.setUser(expect.objectContaining({ uuid: 'user-uuid' })));
    expect(mockDispatch).toHaveBeenCalledWith(userThunks.initializeUserThunk());
    expect(mockDispatch).toHaveBeenCalledWith(productsThunks.initializeThunk());
    expect(mockDispatch).toHaveBeenCalledWith(planThunks.initializeThunk());
    expect(mockDispatch).toHaveBeenCalledWith(referralsThunks.initializeThunk());
    expect(navigationService.push).toHaveBeenCalledWith(AppView.Drive);
    expect(mockSetShowError).toHaveBeenCalledWith(true);
  });

  it('should handle registration failure and set error', async () => {
    const mockError = new Error('Registration failed');
    mockDoRegisterPreCreatedUser.mockRejectedValue(mockError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(errorService.castError).mockReturnValue({ message: 'Registration failed' } as any);

    await guestSignupOnSubmit({
      formData: mockFormData,
      invitationId: 'invite-123',
      doRegisterPreCreatedUser: mockDoRegisterPreCreatedUser,
      dispatch: mockDispatch,
      setIsLoading: mockSetIsLoading,
      setSignupError: mockSetSignupError,
      setShowError: mockSetShowError,
      redirectTo: AppView.Drive,
    });

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    expect(errorService.reportError).toHaveBeenCalledWith(mockError);
    expect(errorService.castError).toHaveBeenCalledWith(mockError);
    expect(mockSetSignupError).toHaveBeenCalledWith('Registration failed');
    expect(mockSetShowError).toHaveBeenCalledWith(true);
    expect(navigationService.push).not.toHaveBeenCalled();
  });

  it('should handle missing token by passing empty string', async () => {
    mockDoRegisterPreCreatedUser.mockResolvedValue(mockRegistrationResponse);

    const formDataWithoutToken: IFormValues = {
      ...mockFormData,
      token: '',
    };

    await guestSignupOnSubmit({
      formData: formDataWithoutToken,
      invitationId: 'invite-123',
      doRegisterPreCreatedUser: mockDoRegisterPreCreatedUser,
      dispatch: mockDispatch,
      setIsLoading: mockSetIsLoading,
      setSignupError: mockSetSignupError,
      setShowError: mockSetShowError,
      redirectTo: AppView.Drive,
    });

    expect(mockDoRegisterPreCreatedUser).toHaveBeenCalledWith('test@example.com', 'password123', 'invite-123', '');
  });
});
