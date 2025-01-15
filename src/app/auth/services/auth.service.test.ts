/**
 * @jest-environment jsdom
 */
import * as authService from './auth.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as keysService from 'app/crypto/services/keys.service';
import { vi, describe, it, beforeAll, beforeEach, expect, afterAll } from 'vitest';
import { Buffer } from 'buffer';
import { encryptTextWithKey } from 'app/crypto/services/utils';
import { SdkFactory } from '../../core/factory/sdk';

if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} } as any;
}

const originalEnv = process.env.REACT_APP_CRYPTO_SECRET;
const originalSalt = process.env.REACT_APP_MAGIC_SALT;
const originalIV = process.env.REACT_APP_MAGIC_IV;
const originalURL = process.env.REACT_APP_API_URL;

beforeAll(() => {
  process.env.REACT_APP_CRYPTO_SECRET = '123456789QWERTY';
  process.env.REACT_APP_MAGIC_IV = '12345678912345678912345678912345';
  process.env.REACT_APP_MAGIC_SALT =
    '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  process.env.REACT_APP_API_URL = 'https://mock';
  globalThis.Buffer = Buffer;

  window.gtag = vi.fn();
  vi.mock('app/core/services/navigation.service', () => ({
    default: {
      isCurrentPath: vi.fn(),
      push: vi.fn(),
    },
  }));
  vi.mock('app/analytics/impact.service', () => ({
    trackSignUp: vi.fn(),
  }));
  vi.mock('app/core/types', () => ({
    default: {
      AppError: vi.fn(),
    },
    AppView: vi.fn(),
  }));
  vi.mock('app/database/services/database.service', () => ({
    default: {
      clear: vi.fn(),
    },
  }));
  vi.mock('../../core/factory/sdk', () => ({
    SdkFactory: {
      getNewApiInstance: vi.fn(() => ({
        createAuthClient: vi.fn(() => ({
          login: vi.fn(),
        })),
      })),
      getInstance: vi.fn(() => ({
        createDesktopAuthClient: vi.fn(() => ({
          login: vi.fn(),
        })),
      })),
    },
  }));
  vi.mock('app/payment/types', () => ({
    AuthMethodTypes: vi.fn(),
  }));
  vi.mock('app/store', () => ({
    AppDispatch: vi.fn(),
  }));
  vi.mock('app/store/slices/plan', () => ({
    planThunks: vi.fn(),
  }));
  vi.mock('app/store/slices/products', () => ({
    productsThunks: vi.fn(),
  }));

  vi.mock('app/store/slices/referrals', () => ({
    referralsThunks: vi.fn(),
  }));

  vi.mock('app/store/slices/user', async () => ({
    userActions: {
      setUser: vi.fn(),
    },
    initializeUserThunk: vi.fn(),
    userThunks: vi.fn(),
  }));

  vi.mock('app/store/slices/workspaces/workspacesStore', () => ({
    workspaceThunks: vi.fn(),
  }));

  vi.mock('../../core/services/http.service', () => ({
    default: {
      getHeaders: vi.fn(),
      convertHeadersToNativeHeaders: vi.fn(),
    },
  }));

  vi.mock('app/core/services/socket.service', () => ({
    default: {
      getInstance: vi.fn(),
    },
  }));

  vi.mock('app/analytics/utils', () => ({
    getCookie: vi.fn(),
    setCookie: vi.fn(),
  }));
  vi.mock('app/store/slices/user', () => ({
    initializeUserThunk: vi.fn(),
    userActions: vi.fn(),
    userThunks: vi.fn(),
  }));
  vi.mock('app/core/services/local-storage.service', () => ({
    default: {
      get: vi.fn(),
      clear: vi.fn(),
      getUser: vi.fn(),
      set: vi.fn(),
    },
  }));
  vi.mock('app/core/services/error.service', () => ({
    default: {
      castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
      reportError: vi.fn(),
    },
  }));
  vi.mock('@sentry/react', () => ({
    setUser: vi.fn(),
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  process.env.REACT_APP_CRYPTO_SECRET = originalEnv;
  process.env.REACT_APP_MAGIC_SALT = originalSalt;
  process.env.REACT_APP_MAGIC_IV = originalIV;
  process.env.REACT_APP_API_URL = originalURL;
});

async function getMockUser(password: string, mnemonic: string) {
  const keys = await keysService.getKeys(password);
  const encryptedMnemonic = encryptTextWithKey(mnemonic, password);

  const mockUser: UserSettings = {
    uuid: 'mock-uuid',
    email: 'mock@email.com',
    privateKey: keys.ecc.privateKeyEncrypted,
    mnemonic: encryptedMnemonic,
    userId: 'mock-userId',
    name: 'mock-name',
    lastname: 'mock-lastname',
    username: 'mock-username',
    bridgeUser: 'mock-bridgeUser',
    bucket: 'mock-bucket',
    backupsBucket: null,
    root_folder_id: 0,
    rootFolderId: 'mock-rootFolderId',
    rootFolderUuid: undefined,
    sharedWorkspace: false,
    credit: 0,
    publicKey: keys.ecc.publicKey,
    revocationKey: keys.revocationCertificate,
    keys: {
      ecc: {
        publicKey: keys.ecc.publicKey,
        privateKeyEncrypted: keys.ecc.privateKeyEncrypted,
      },
      kyber: {
        publicKey: keys.kyber.publicKey ?? '',
        privateKeyEncrypted: keys.kyber.privateKeyEncrypted ?? '',
      },
    },
    appSumoDetails: null,
    registerCompleted: false,
    hasReferralsProgram: false,
    createdAt: new Date(),
    avatar: null,
    emailVerified: false,
  };

  return mockUser;
}

describe('logIn', () => {
  it('log in should correctly decrypt keys', async () => {
    const mockToken = 'test-token';
    const mockNewToken = 'test-new-token';
    const mockLoginType = 'web';

    const mockPassword = 'password123';
    const mockMnemonic = 'mock-clearMnemonic';
    const mockUser = await getMockUser(mockPassword, mockMnemonic);
    const mockTwoFactorCode = '123456';

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        login: vi.fn().mockResolvedValue({
          user: mockUser,
          token: mockToken,
          newToken: mockNewToken,
        }),
      }),
    } as any);

    const result = await authService.doLogin(mockUser.email, mockPassword, mockTwoFactorCode, mockLoginType);

    const plainPrivateKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.keys.ecc.privateKeyEncrypted, mockPassword),
    ).toString('base64');
    const plainPrivateKyberKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.keys.kyber.privateKeyEncrypted, mockPassword),
    ).toString('base64');

    const mockClearUser = {
      ...mockUser,
      mnemonic: mockMnemonic,
      privateKey: plainPrivateKeyInBase64,
      keys: {
        ecc: {
          publicKey: mockUser.keys.ecc.publicKey,
          privateKeyEncrypted: plainPrivateKeyInBase64,
        },
        kyber: {
          publicKey: mockUser.keys.kyber.publicKey,
          privateKeyEncrypted: plainPrivateKyberKeyInBase64,
        },
      },
    };

    expect(result).toEqual({
      token: mockToken,
      user: mockClearUser,
      mnemonic: mockMnemonic,
    });
  });
});

/*
describe('signUp', () => {
  it('signUp should correctly decrypt keys', async () => {
    const mockToken = 'test-token';
    const mockNewToken = 'test-new-token';
    const mockEmail = 'test@example.com';

    const mockPassword = 'password123';
    const mockMnemonic = 'mock-clearMnemonic';
    const mockUser = await getMockUser(mockPassword, mockMnemonic);

    const mockSignUpResponse = {
      xUser: mockUser,
      xToken: mockToken,
      mnemonic: mockUser.mnemonic,
    };

    const params = {
      doSignUp: vi.fn().mockResolvedValue(mockSignUpResponse),
      email: mockEmail,
      password: mockPassword,
      token: mockToken,
      isNewUser: true,
      redeemCodeObject: false,
      dispatch: vi.fn(),
    };

    const mockRes = new Response(mockNewToken, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('TOKEN TEST:', await mockRes.json());

    vi.spyOn(globalThis, 'fetch').mockReturnValue(Promise.resolve(mockRes));

    vi.spyOn(authService, 'getNewToken').mockReturnValue(Promise.resolve(mockNewToken));
    //const spy = vi.spyOn(, 'userActions').mockImplementation(vi.fn());

    const result = await authService.signUp(params);

    const plainPrivateKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.keys.ecc.privateKeyEncrypted, mockPassword),
    ).toString('base64');
    const plainPrivateKyberKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.keys.kyber.privateKeyEncrypted, mockPassword),
    ).toString('base64');

    const mockClearUser = {
      ...mockUser,
      mnemonic: mockMnemonic,
      privateKey: plainPrivateKeyInBase64,
      keys: {
        ecc: {
          publicKey: mockUser.keys.ecc.publicKey,
          privateKeyEncrypted: plainPrivateKeyInBase64,
        },
        kyber: {
          publicKey: mockUser.keys.kyber.publicKey,
          privateKeyEncrypted: plainPrivateKyberKeyInBase64,
        },
      },
    };
    // expect(spy).toBeCalledWith(mockClearUser);

    expect(result).toEqual({
      token: mockToken, //mockNewToken,
      user: mockUser,
      mnemonic: mockUser.mnemonic,
    });
  });
}); */

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
