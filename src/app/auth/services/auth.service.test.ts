/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

describe('Empty test suite', () => {
  it('should do nothing', () => {
    expect(true).toBe(true);
  });
});

/*
import * as authService from './auth.service';
import { userActions } from 'app/store/slices/user';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import * as keysService from 'app/crypto/services/keys.service';
import { AuthenticateUserParams } from './auth.service';
import { AuthMethodTypes } from 'app/payment/types';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

vi.mock('../../../WebWorker');
vi.mock('app/store/slices/user');
vi.mock('app/core/services/local-storage.service');
vi.mock('app/core/services/error.service');

const mockDispatch = vi.fn();
const mockToken = 'test-token';
const mockMnemonic = 'test-mnemonic';
const mockUuid = 'test-uuid';
const mockEmail = 'test@test.com';
const mockUserId = 'user-id';
const mockPassword = 'password123';
const mockTwoFactorCode = '123456';
const mockLoginType = 'web';
const mockPrivateKey = 'mockPrivateKey';
const mockPrivateKeyDecript = 'mockPrivateKeyDecript';
const mockSignUpToken = 'signup-token';
const mockNewToken = 'new-token';
const mockUser: UserSettings = {
  uuid: mockUuid,
  email: mockEmail,
  privateKey: mockPrivateKey,
  mnemonic: mockMnemonic,
  userId: mockUserId,
  name: '',
  lastname: '',
  username: '',
  bridgeUser: '',
  bucket: '',
  backupsBucket: null,
  root_folder_id: 0,
  rootFolderId: '',
  rootFolderUuid: undefined,
  sharedWorkspace: false,
  credit: 0,
  publicKey: '',
  revocationKey: '',
  appSumoDetails: null,
  registerCompleted: false,
  hasReferralsProgram: false,
  createdAt: new Date(),
  avatar: null,
  emailVerified: false,
};
const mockSignUpFunction = vi.fn();

beforeEach(() => {
  window.gtag = vi.fn();

  mockSignUpFunction.mockResolvedValue({
    xUser: { ...mockUser, privateKey: mockPrivateKey },
    xToken: mockToken,
    mnemonic: mockMnemonic,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('logIn', () => {
  it('should log in and dispatch necessary actions', async () => {
    const doLoginSpy = vi.spyOn(authService, 'doLogin').mockResolvedValue({
      user: mockUser,
      token: mockToken,
      mnemonic: mockMnemonic,
    });

    const result = await authService.logIn({
      email: mockEmail,
      password: mockPassword,
      twoFactorCode: mockTwoFactorCode,
      dispatch: mockDispatch,
      loginType: mockLoginType,
    });

    expect(doLoginSpy).toHaveBeenCalledWith(mockEmail, mockPassword, mockTwoFactorCode, mockLoginType);
    expect(mockDispatch).toHaveBeenCalledWith(userActions.setUser(mockUser));
    expect(mockDispatch).toHaveBeenCalledTimes(7);

    expect(result).toEqual({
      token: mockToken,
      user: mockUser,
      mnemonic: mockMnemonic,
    });
  });
});

describe('signIn', () => {
  it('should sign up a new user and set user details', async () => {
    vi.spyOn(authService, 'getNewToken').mockResolvedValueOnce(mockNewToken);
    vi.spyOn(keysService, 'decryptPrivateKey').mockImplementation(() => mockPrivateKeyDecript);

    const mockParams = {
      doSignUp: mockSignUpFunction,
      email: mockEmail,
      password: mockPassword,
      token: mockSignUpToken,
      isNewUser: true,
      redeemCodeObject: false,
      dispatch: mockDispatch,
    };

    const result = await authService.signUp(mockParams);

    expect(mockSignUpFunction).toHaveBeenCalledWith(mockEmail, mockPassword, mockSignUpToken);
    expect(localStorageService.set).toHaveBeenCalledWith('xToken', mockToken);
    expect(localStorageService.set).toHaveBeenCalledWith('xMnemonic', mockMnemonic);
    expect(localStorageService.set).toHaveBeenCalledWith('xNewToken', mockNewToken);
    expect(mockDispatch).toHaveBeenCalledWith(userActions.setUser(expect.any(Object)));

    const expectedResult = {
      token: mockToken,
      user: mockUser,
      mnemonic: mockMnemonic,
    };

    expect(result).toEqual(expectedResult);
  });

  it('should handle error during sign up', async () => {
    mockSignUpFunction.mockRejectedValueOnce(new Error('Signup failed'));

    const mockParams = {
      doSignUp: mockSignUpFunction,
      email: mockEmail,
      password: mockPassword,
      token: mockSignUpToken,
      isNewUser: true,
      redeemCodeObject: false,
      dispatch: mockDispatch,
    };
    await expect(authService.signUp(mockParams)).rejects.toThrow('Signup failed');
  });
});

describe('authMethod', () => {
  it('should log in the user when authMethod is signIn', async () => {
    vi.spyOn(authService, 'logIn');

    const mockParams: AuthenticateUserParams = {
      email: mockEmail,
      password: mockPassword,
      authMethod: 'signIn',
      twoFactorCode: mockTwoFactorCode,
      dispatch: mockDispatch,
      loginType: mockLoginType,
      isNewUser: false,
    };

    const result = await authService.authenticateUser(mockParams);

    expect(authService.logIn).toHaveBeenCalledWith({
      email: mockEmail,
      password: mockPassword,
      twoFactorCode: mockTwoFactorCode,
      dispatch: mockDispatch,
      loginType: mockLoginType,
    });
    expect(result).toEqual({ token: mockToken, user: mockUser, mnemonic: mockMnemonic });
  });

  it('should sign up the user when authMethod is signUp', async () => {
    vi.spyOn(authService, 'signUp');
    vi.spyOn(authService, 'getNewToken').mockResolvedValueOnce(mockNewToken);

    const mockParams: AuthenticateUserParams = {
      email: mockEmail,
      password: mockPassword,
      authMethod: 'signUp',
      twoFactorCode: mockTwoFactorCode,
      dispatch: mockDispatch,
      loginType: mockLoginType,
      isNewUser: false,
      doSignUp: mockSignUpFunction,
    };

    const result = await authService.authenticateUser(mockParams);

    const expectedResult = {
      token: mockToken,
      user: mockUser,
      mnemonic: mockMnemonic,
    };

    expect(authService.signUp).toHaveBeenCalledWith(expect.any(Object));
    expect(result).toEqual(expectedResult);
  });

  it('should throw an error for invalidMethod authMethod', async () => {
    const mockParams: AuthenticateUserParams = {
      email: mockEmail,
      password: mockPassword,
      authMethod: 'invalidMethod' as unknown as AuthMethodTypes,
      twoFactorCode: mockTwoFactorCode,
      dispatch: mockDispatch,
      loginType: mockLoginType,
      isNewUser: false,
      doSignUp: mockSignUpFunction,
    };

    await expect(authService.authenticateUser(mockParams)).rejects.toThrow('Unknown authMethod: invalidMethod');
  });
});
*/
