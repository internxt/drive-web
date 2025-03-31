/**
 * @jest-environment jsdom
 */
import * as authService from './auth.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as keysService from 'app/crypto/services/keys.service';
import { vi, describe, it, beforeAll, beforeEach, expect, afterAll } from 'vitest';
import { Buffer } from 'buffer';
import { encryptTextWithKey, encryptText } from 'app/crypto/services/utils';
import { SdkFactory } from '../../core/factory/sdk';
import localStorageService from 'app/core/services/local-storage.service';
import { userActions } from 'app/store/slices/user';
import * as pgpService from 'app/crypto/services/pgp.service';
import { validateMnemonic } from 'bip39';
import { BackupData } from 'app/utils/backupKeyUtils';
import { aes } from '@internxt/lib';

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
        createDesktopAuthClient: vi.fn(() => ({
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
    planThunks: {
      initializeThunk: vi.fn(),
    },
  }));
  vi.mock('app/store/slices/products', () => ({
    productsThunks: {
      initializeThunk: vi.fn(),
    },
  }));

  vi.mock('app/store/slices/referrals', () => ({
    referralsThunks: {
      initializeThunk: vi.fn(),
    },
  }));

  vi.mock('app/store/slices/user', () => ({
    initializeUserThunk: vi.fn(),
    userActions: {
      setUser: vi.fn(),
    },
    userThunks: {
      initializeUserThunk: vi.fn(),
    },
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

  vi.mock('bip39', () => ({
    validateMnemonic: vi.fn(),
    generateMnemonic: vi.fn(),
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
        privateKey: keys.ecc.privateKeyEncrypted,
      },
      kyber: {
        publicKey: keys.kyber.publicKey ?? '',
        privateKey: keys.kyber.privateKeyEncrypted ?? '',
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
    const mockMnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
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
      createDesktopAuthClient: vi.fn().mockReturnValue({
        login: vi.fn().mockResolvedValue({
          user: mockUser,
          token: mockToken,
          newToken: mockNewToken,
        }),
      }),
    } as any);

    const result = await authService.doLogin(mockUser.email, mockPassword, mockTwoFactorCode, mockLoginType);

    const plainPrivateKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.keys.ecc.privateKey, mockPassword),
    ).toString('base64');
    const plainPrivateKyberKeyInBase64 = keysService.decryptPrivateKey(mockUser.keys.kyber.privateKey, mockPassword);

    const mockClearUser = {
      ...mockUser,
      mnemonic: mockMnemonic,
      privateKey: plainPrivateKeyInBase64,
      keys: {
        ecc: {
          publicKey: mockUser.keys.ecc.publicKey,
          privateKey: plainPrivateKeyInBase64,
        },
        kyber: {
          publicKey: mockUser.keys.kyber.publicKey,
          privateKey: plainPrivateKyberKeyInBase64,
        },
      },
    };

    expect(result).toEqual({
      token: mockToken,
      newToken: mockNewToken,
      user: mockClearUser,
      mnemonic: mockMnemonic,
    });
  });

  it('log in should correctly decrypt keys for old user structure', async () => {
    const mockToken = 'test-token';
    const mockNewToken = 'test-new-token';
    const mockLoginType = 'web';

    const mockPassword = 'password123';
    const mockMnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const keys = await keysService.getKeys(mockPassword);
    const encryptedMnemonic = encryptTextWithKey(mockMnemonic, mockPassword);

    const mockOlsUser: Partial<UserSettings> = {
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
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };
    const mockTwoFactorCode = '123456';

    const mockUser = mockOlsUser as UserSettings;

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        login: vi.fn().mockResolvedValue({
          user: mockUser,
          token: mockToken,
          newToken: mockNewToken,
        }),
      }),
      createDesktopAuthClient: vi.fn().mockReturnValue({
        login: vi.fn().mockResolvedValue({
          user: mockUser,
          token: mockToken,
          newToken: mockNewToken,
        }),
      }),
    } as any);

    const result = await authService.doLogin(mockUser.email, mockPassword, mockTwoFactorCode, mockLoginType);

    const plainPrivateKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.privateKey, mockPassword),
    ).toString('base64');

    const mockClearUser = {
      ...mockUser,
      mnemonic: mockMnemonic,
      privateKey: plainPrivateKeyInBase64,
      keys: {
        ecc: {
          publicKey: mockUser.publicKey,
          privateKey: plainPrivateKeyInBase64,
        },
        kyber: {
          publicKey: '',
          privateKey: '',
        },
      },
    };

    expect(result).toEqual({
      token: mockToken,
      newToken: mockNewToken,
      user: mockClearUser,
      mnemonic: mockMnemonic,
    });
  });
});

describe('signUp', () => {
  it('signUp should correctly decrypt keys', async () => {
    const mockToken = 'test-token';
    const mockNewToken = 'test-new-token';
    const mockEmail = 'test@example.com';

    const mockPassword = 'password123';
    const mockMnemonicNotEnc =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const mockUser = await getMockUser(mockPassword, mockMnemonicNotEnc);

    const mockSignUpResponse = {
      xUser: {
        ...mockUser,
        mnemonic: mockMnemonicNotEnc,
      },
      xToken: mockToken,
      mnemonic: mockMnemonicNotEnc,
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

    const mockRes = new Response(
      JSON.stringify({
        newToken: mockNewToken,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    vi.spyOn(globalThis, 'fetch').mockReturnValue(Promise.resolve(mockRes));

    const spy = vi.spyOn(userActions, 'setUser');

    const result = await authService.signUp(params);

    expect(localStorageService.set).toHaveBeenCalledWith('xNewToken', mockNewToken);

    const plainPrivateKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.keys.ecc.privateKey, mockPassword),
    ).toString('base64');
    const plainPrivateKyberKeyInBase64 = keysService.decryptPrivateKey(mockUser.keys.kyber.privateKey, mockPassword);

    const mockClearUser = {
      ...mockUser,
      mnemonic: mockMnemonicNotEnc,
      privateKey: plainPrivateKeyInBase64,
      keys: {
        ecc: {
          publicKey: mockUser.keys.ecc.publicKey,
          privateKey: plainPrivateKeyInBase64,
        },
        kyber: {
          publicKey: mockUser.keys.kyber.publicKey,
          privateKey: plainPrivateKyberKeyInBase64,
        },
      },
    };
    expect(spy).toBeCalledWith(mockClearUser);

    expect(result).toEqual({
      token: mockToken,
      newToken: mockNewToken,
      user: {
        ...mockUser,
        mnemonic: mockMnemonicNotEnc,
      },
      mnemonic: mockMnemonicNotEnc,
    });
  });

  it('signUp should work for old user structure', async () => {
    const mockToken = 'test-token';
    const mockNewToken = 'test-new-token';
    const mockEmail = 'test@example.com';

    const mockPassword = 'password123';
    const mockMnemonicNotEnc =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const keys = await keysService.getKeys(mockPassword);
    const encryptedMnemonic = encryptTextWithKey(mockMnemonicNotEnc, mockPassword);
    const mockOldUser: Partial<UserSettings> = {
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
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };

    const mockUser = mockOldUser as UserSettings;

    const mockSignUpResponse = {
      xUser: {
        ...mockUser,
        mnemonic: mockMnemonicNotEnc,
      },
      xToken: mockToken,
      mnemonic: mockMnemonicNotEnc,
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

    const mockRes = new Response(
      JSON.stringify({
        newToken: mockNewToken,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    vi.spyOn(globalThis, 'fetch').mockReturnValue(Promise.resolve(mockRes));

    const spy = vi.spyOn(userActions, 'setUser');

    const result = await authService.signUp(params);

    expect(localStorageService.set).toHaveBeenCalledWith('xNewToken', mockNewToken);

    const plainPrivateKeyInBase64 = Buffer.from(
      keysService.decryptPrivateKey(mockUser.privateKey, mockPassword),
    ).toString('base64');

    const mockClearUser = {
      ...mockUser,
      mnemonic: mockMnemonicNotEnc,
      privateKey: plainPrivateKeyInBase64,
      keys: {
        ecc: {
          publicKey: mockUser.publicKey,
          privateKey: plainPrivateKeyInBase64,
        },
        kyber: {
          publicKey: '',
          privateKey: '',
        },
      },
    };
    expect(spy).toBeCalledWith(mockClearUser);

    expect(result).toEqual({
      token: mockToken,
      newToken: mockNewToken,
      user: {
        ...mockUser,
        mnemonic: mockMnemonicNotEnc,
      },
      mnemonic: mockMnemonicNotEnc,
    });
  });
});

describe('Change password', () => {
  it('changePassword should correctly re-encrypt keys', async () => {
    const mockOldPassword = 'password123';
    const mockNewPassword = 'newPassword123';
    const mockEmail = 'test@example.com';

    const mockMnemonicNotEnc =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const keys = await pgpService.generateNewKeys();
    const mockClearUser: Partial<UserSettings> = {
      mnemonic: mockMnemonicNotEnc,
      publicKey: keys.publicKeyArmored,
      revocationKey: keys.revocationCertificate,
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: Buffer.from(keys.privateKyberKeyBase64).toString('base64'),
        },
      },
    };

    const mockUser = mockClearUser as UserSettings;
    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);

    const mockSalt = 'mockSalt';
    const encryptedSalt = encryptText(mockSalt);

    const changePasswordMock = vi
      .fn()
      .mockReturnValue(Promise.resolve({ newToken: 'newMockToken', token: 'mockToken' }));
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        changePassword: changePasswordMock,
        securityDetails: vi.fn().mockReturnValue({ encryptedSalt }),
      }),
      createDesktopAuthClient: vi.fn().mockReturnValue({
        changePassword: changePasswordMock,
        securityDetails: vi.fn().mockReturnValue({ encryptedSalt }),
      }),
      createNewUsersClient: vi.fn().mockReturnValue({
        changePassword: changePasswordMock,
      }),
    } as any);

    await authService.changePassword(mockNewPassword, mockOldPassword, mockEmail);
    expect(changePasswordMock).toBeCalled();
    const [inputs] = changePasswordMock.mock.calls[0];

    const privateKeyEncrypted = inputs.encryptedPrivateKey;
    const privateKey = keysService.decryptPrivateKey(privateKeyEncrypted, mockNewPassword);
    const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
    expect(privateKeyBase64).toBe(mockUser.privateKey);

    const privateKyberKeyEncrypted = inputs.keys.encryptedPrivateKyberKey;
    const privateKyberKey = keysService.decryptPrivateKey(privateKyberKeyEncrypted, mockNewPassword);
    expect(privateKyberKey).toBe(mockUser.keys.kyber.privateKey);
  });

  it('changePassword should correctly re-encrypt keys for old users', async () => {
    const mockOldPassword = 'password123';
    const mockNewPassword = 'newPassword123';
    const mockEmail = 'test@example.com';

    const mockMnemonicNotEnc =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const keys = await pgpService.generateNewKeys();
    const mockClearUser: Partial<UserSettings> = {
      mnemonic: mockMnemonicNotEnc,
      publicKey: keys.publicKeyArmored,
      revocationKey: keys.revocationCertificate,
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
    };

    const mockUser = mockClearUser as UserSettings;
    vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser);

    const mockSalt = 'mockSalt';
    const encryptedSalt = encryptText(mockSalt);

    const changePasswordMock = vi
      .fn()
      .mockReturnValue(Promise.resolve({ newToken: 'newMockToken', token: 'mockToken' }));
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        changePassword: changePasswordMock,
        securityDetails: vi.fn().mockReturnValue({ encryptedSalt }),
      }),
      createDesktopAuthClient: vi.fn().mockReturnValue({
        changePassword: changePasswordMock,
        securityDetails: vi.fn().mockReturnValue({ encryptedSalt }),
      }),
      createNewUsersClient: vi.fn().mockReturnValue({
        changePassword: changePasswordMock,
      }),
    } as any);

    await authService.changePassword(mockNewPassword, mockOldPassword, mockEmail);
    expect(changePasswordMock).toBeCalled();
    const [inputs] = changePasswordMock.mock.calls[0];

    const privateKeyEncrypted = inputs.encryptedPrivateKey;
    const privateKey = keysService.decryptPrivateKey(privateKeyEncrypted, mockNewPassword);
    const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
    expect(privateKeyBase64).toBe(mockUser.privateKey);

    const privateKyberKeyEncrypted = inputs.keys.encryptedPrivateKyberKey;
    expect(privateKyberKeyEncrypted).toBe('');
  });

  it('should cancel account', async () => {
    const mockSendDeactivationEmail = vi.fn().mockReturnValue({ success: true });
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        sendUserDeactivationEmail: mockSendDeactivationEmail,
      }),
    } as any);
    vi.spyOn(localStorageService, 'get').mockReturnValue('token');

    await authService.cancelAccount();
    expect(mockSendDeactivationEmail).toHaveBeenCalledWith('token');
  });
});

describe('updateCredentialsWithToken', () => {
  beforeEach(() => {
    (validateMnemonic as any).mockReset();
  });

  it('should successfully update credentials with token and without backup data', async () => {
    const mockToken = 'test-reset-token';
    const mockNewPassword = 'newPassword123';
    const mockMnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    (validateMnemonic as any).mockReturnValue(true);

    const mockChangePasswordWithLink = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        changePasswordWithLink: mockChangePasswordWithLink,
      }),
    } as any);

    await authService.updateCredentialsWithToken(mockToken, mockNewPassword, mockMnemonic);

    expect(mockChangePasswordWithLink).toHaveBeenCalled();
    const [token, encryptedPassword, encryptedSalt, encryptedMnemonic, keys] = mockChangePasswordWithLink.mock.calls[0];

    expect(token).toBe(mockToken);
    expect(encryptedPassword).toBeDefined();
    expect(encryptedSalt).toBeDefined();
    expect(encryptedMnemonic).toBeDefined();
    expect(keys).toBeUndefined();
  });

  it('should successfully update credentials with token and with backup data (ECC only)', async () => {
    const mockToken = 'test-reset-token';
    const mockNewPassword = 'newPassword123';
    const mockMnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const mockBackupData: BackupData = {
      privateKey: 'test-private-key',
      mnemonic: '',
      keys: {
        ecc: '',
        kyber: '',
      },
    };

    (validateMnemonic as any).mockReturnValue(true);

    vi.spyOn(aes, 'encrypt').mockReturnValue('mock-encrypted-data');

    const mockChangePasswordWithLink = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        changePasswordWithLink: mockChangePasswordWithLink,
      }),
    } as any);

    await authService.updateCredentialsWithToken(mockToken, mockNewPassword, mockMnemonic, mockBackupData);

    expect(mockChangePasswordWithLink).toHaveBeenCalled();
    const [token, encryptedPassword, encryptedSalt, encryptedMnemonic, keys] = mockChangePasswordWithLink.mock.calls[0];

    expect(token).toBe(mockToken);
    expect(encryptedPassword).toBeDefined();
    expect(encryptedSalt).toBeDefined();
    expect(encryptedMnemonic).toBeDefined();
    expect(keys).toBeDefined();

    expect(keys.ecc).toBe('mock-encrypted-data');
    expect(keys.kyber).toBeUndefined();
  });

  it('should successfully update credentials with token and with backup data (ECC and Kyber)', async () => {
    const mockToken = 'test-reset-token';
    const mockNewPassword = 'newPassword123';
    const mockMnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const mockBackupData: BackupData = {
      privateKey: '',
      mnemonic: '',
      keys: {
        ecc: 'test-ecc-private-key',
        kyber: 'test-kyber-private-key',
      },
    };

    (validateMnemonic as any).mockReturnValue(true);

    vi.spyOn(aes, 'encrypt').mockReturnValue('mock-encrypted-data');

    const mockChangePasswordWithLink = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        changePasswordWithLink: mockChangePasswordWithLink,
      }),
    } as any);

    await authService.updateCredentialsWithToken(mockToken, mockNewPassword, mockMnemonic, mockBackupData);

    expect(mockChangePasswordWithLink).toHaveBeenCalled();
    const [token, encryptedPassword, encryptedSalt, encryptedMnemonic, keys] = mockChangePasswordWithLink.mock.calls[0];

    expect(token).toBe(mockToken);
    expect(encryptedPassword).toBeDefined();
    expect(encryptedSalt).toBeDefined();
    expect(encryptedMnemonic).toBeDefined();
    expect(keys).toBeDefined();

    expect(keys.ecc).toBe('mock-encrypted-data');
    expect(keys.kyber).toBe('mock-encrypted-data');
  });

  it('should throw an error when mnemonic is invalid', async () => {
    const mockToken = 'test-reset-token';
    const mockNewPassword = 'newPassword123';
    const mockInvalidMnemonic = 'invalid mnemonic here';

    (validateMnemonic as any).mockReturnValue(false);

    await expect(
      authService.updateCredentialsWithToken(mockToken, mockNewPassword, mockInvalidMnemonic),
    ).rejects.toThrow('Invalid mnemonic');
  });

  it('should handle errors from changePasswordWithLink', async () => {
    const mockToken = 'test-reset-token';
    const mockNewPassword = 'newPassword123';
    const mockMnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';

    (validateMnemonic as any).mockReturnValue(true);

    const mockError = new Error('API error');
    const mockChangePasswordWithLink = vi.fn().mockRejectedValue(mockError);
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        changePasswordWithLink: mockChangePasswordWithLink,
      }),
    } as any);

    await expect(authService.updateCredentialsWithToken(mockToken, mockNewPassword, mockMnemonic)).rejects.toThrow(
      'API error',
    );
  });
});
