/**
 * @jest-environment jsdom
 */
import { aes } from '@internxt/lib';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'services/env.service';
import localStorageService from 'services/local-storage.service';
import * as keysService from 'app/crypto/services/keys.service';
import * as pgpService from 'app/crypto/services/pgp.service';
import { encryptText, encryptTextWithKey } from 'app/crypto/services/utils';
import { userActions } from 'app/store/slices/user';
import { BackupData } from 'utils/backupKeyUtils';
import { validateMnemonic } from 'bip39';
import { Buffer } from 'node:buffer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkFactory } from 'app/core/factory/sdk';
import * as authService from './auth.service';

const mockSecret = '123456789QWERTY';
const mockApi = 'https://mock';

beforeAll(() => {
  globalThis.Buffer = Buffer;

  globalThis.gtag = vi.fn();
  vi.mock('services/navigation.service', () => ({
    default: {
      isCurrentPath: vi.fn(),
      push: vi.fn(),
    },
  }));
  vi.mock('app/analytics/impact.service', () => ({
    trackSignUp: vi.fn(),
  }));
  vi.mock('app/database/services/database.service', () => ({
    default: {
      clear: vi.fn(),
    },
    DatabaseCollection: {},
    DatabaseProvider: {},
    LRUCacheTypes: {},
  }));
  vi.mock('app/core/factory/sdk', () => ({
    SdkFactory: {
      getNewApiInstance: vi.fn(() => ({
        createAuthClient: vi.fn(() => ({
          login: vi.fn(),
        })),
        createDesktopAuthClient: vi.fn(() => ({
          login: vi.fn(),
        })),
      })),
    },
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

  vi.mock('services/sockets/socket.service', () => ({
    default: {
      getInstance: vi.fn().mockReturnValue({
        stop: vi.fn(),
      }),
    },
  }));

  vi.mock('app/analytics/utils', () => ({
    getCookie: vi.fn(),
    setCookie: vi.fn(),
  }));

  vi.mock('services/local-storage.service', () => ({
    default: {
      get: vi.fn(),
      clear: vi.fn(),
      getUser: vi.fn(),
      set: vi.fn(),
    },
  }));
  vi.mock('./vpnAuth.service', () => ({
    default: {
      logOut: vi.fn(),
    },
  }));

  vi.mock('services/error.service', () => ({
    default: {
      castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
      reportError: vi.fn(),
    },
  }));

  vi.mock('bip39', async () => {
    const actual = await vi.importActual<typeof import('bip39')>('bip39');
    return {
      ...actual,
      validateMnemonic: vi.fn(),
      generateMnemonic: vi.fn(),
    };
  });
  vi.mock('utils', () => ({
    generateCaptchaToken: vi.fn(),
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
    if (key === 'newApi') return mockApi;
    if (key === 'secret') return mockSecret;
    else return 'no mock implementation';
  });
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
      xNewToken: mockNewToken,
      mnemonic: mockMnemonicNotEnc,
    };

    const params = {
      doSignUp: vi.fn().mockResolvedValue(mockSignUpResponse),
      email: mockEmail,
      password: mockPassword,
      token: mockToken,
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
      xNewToken: mockNewToken,
      mnemonic: mockMnemonicNotEnc,
    };

    const params = {
      doSignUp: vi.fn().mockResolvedValue(mockSignUpResponse),
      email: mockEmail,
      password: mockPassword,
      token: mockToken,
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
      createUsersClient: vi.fn().mockReturnValue({
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
      createUsersClient: vi.fn().mockReturnValue({
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
        changePasswordWithLinkV2: mockChangePasswordWithLink,
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

  it('When backup data has no publicKeys (legacy backup), then it should send only privateKeys', async () => {
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
        changePasswordWithLinkV2: mockChangePasswordWithLink,
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

    expect(keys.private.ecc).toBe('mock-encrypted-data');
    expect(keys.public).toBeUndefined();
  });

  it('should send both private and public keys when backup data has publicKeys', async () => {
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
      publicKeys: {
        ecc: 'test-ecc-public-key',
        kyber: 'test-kyber-public-key',
      },
    };

    (validateMnemonic as any).mockReturnValue(true);

    vi.spyOn(aes, 'encrypt').mockReturnValue('mock-encrypted-data');

    const mockChangePasswordWithLink = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        changePasswordWithLinkV2: mockChangePasswordWithLink,
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

    expect(keys.private.ecc).toBe('mock-encrypted-data');
    expect(keys.private.kyber).toBe('mock-encrypted-data');
    expect(keys.public).toEqual({
      ecc: 'test-ecc-public-key',
      kyber: 'test-kyber-public-key',
    });
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
        changePasswordWithLinkV2: mockChangePasswordWithLink,
      }),
    } as any);

    await expect(authService.updateCredentialsWithToken(mockToken, mockNewPassword, mockMnemonic)).rejects.toThrow(
      'API error',
    );
  });
});

describe('areCredentialsCorrect', () => {
  it('should return true when credentials are correct', async () => {
    const mockPassword = 'password123';
    const mockSalt = 'mockSalt';
    const mockToken = 'mockToken';

    vi.spyOn(localStorageService, 'get').mockReturnValue(mockToken);

    const encryptedSalt = encryptText(mockSalt);
    const mockAreCredentialsCorrect = vi.fn().mockResolvedValue(true);

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        securityDetails: vi.fn().mockResolvedValue({ encryptedSalt }),
        areCredentialsCorrect: mockAreCredentialsCorrect,
      }),
    } as any);

    const result = await authService.areCredentialsCorrect(mockPassword);

    expect(result).toBe(true);
    expect(mockAreCredentialsCorrect).toHaveBeenCalledWith(expect.any(String), mockToken);
  });

  it('should return false when credentials are incorrect', async () => {
    const mockPassword = 'wrongPassword';
    const mockSalt = 'mockSalt';
    const mockToken = 'mockToken';

    vi.spyOn(localStorageService, 'get').mockReturnValue(mockToken);

    const encryptedSalt = encryptText(mockSalt);
    const mockAreCredentialsCorrect = vi.fn().mockResolvedValue(false);

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        securityDetails: vi.fn().mockResolvedValue({ encryptedSalt }),
        areCredentialsCorrect: mockAreCredentialsCorrect,
      }),
    } as any);

    const result = await authService.areCredentialsCorrect(mockPassword);

    expect(result).toBe(false);
    expect(mockAreCredentialsCorrect).toHaveBeenCalledWith(expect.any(String), mockToken);
  });

  it('should handle undefined token', async () => {
    const mockPassword = 'password123';
    const mockSalt = 'mockSalt';

    vi.spyOn(localStorageService, 'get').mockReturnValue(null);

    const encryptedSalt = encryptText(mockSalt);
    const mockAreCredentialsCorrect = vi.fn().mockResolvedValue(true);

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        securityDetails: vi.fn().mockResolvedValue({ encryptedSalt }),
        areCredentialsCorrect: mockAreCredentialsCorrect,
      }),
    } as any);

    const result = await authService.areCredentialsCorrect(mockPassword);

    expect(result).toBe(true);
    expect(mockAreCredentialsCorrect).toHaveBeenCalledWith(expect.any(String), undefined);
  });

  it('should handle errors from API', async () => {
    const mockPassword = 'password123';
    const mockSalt = 'mockSalt';
    const mockToken = 'mockToken';

    vi.spyOn(localStorageService, 'get').mockReturnValue(mockToken);

    const encryptedSalt = encryptText(mockSalt);
    const mockError = new Error('API error');
    const mockAreCredentialsCorrect = vi.fn().mockRejectedValue(mockError);

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        securityDetails: vi.fn().mockResolvedValue({ encryptedSalt }),
        areCredentialsCorrect: mockAreCredentialsCorrect,
      }),
    } as any);

    await expect(authService.areCredentialsCorrect(mockPassword)).rejects.toThrow('API error');
  });

  it('should use unauthorizedCallback: () => undefined when creating auth client', async () => {
    const mockPassword = 'password123';
    const mockSalt = 'mockSalt';
    const mockToken = 'mockToken';
    const mockEmail = 'test@example.com';
    const mockCreateAuthClient = vi.fn();

    vi.spyOn(localStorageService, 'get').mockImplementation((key: string) => {
      if (key === 'xNewToken') return mockToken;
      return null;
    });

    vi.spyOn(localStorageService, 'getUser').mockReturnValue({
      email: mockEmail,
    } as any);

    const encryptedSalt = encryptText(mockSalt);
    const mockAreCredentialsCorrect = vi.fn().mockResolvedValue(true);
    const mockSecurityDetails = vi.fn().mockResolvedValue({ encryptedSalt });

    mockCreateAuthClient.mockImplementation(() => {
      return {
        securityDetails: mockSecurityDetails,
        areCredentialsCorrect: mockAreCredentialsCorrect,
      };
    });

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: mockCreateAuthClient,
    } as any);

    await authService.areCredentialsCorrect(mockPassword);

    expect(mockCreateAuthClient).toHaveBeenCalledTimes(2);
    expect(mockCreateAuthClient).toHaveBeenNthCalledWith(2, {
      unauthorizedCallback: expect.any(Function),
    });

    const callArgs = mockCreateAuthClient.mock.calls[1][0];
    const unauthorizedResult = callArgs.unauthorizedCallback();
    expect(unauthorizedResult).toBeUndefined();
  });
});

describe('Security and validation', () => {
  describe('getRedirectUrl', () => {
    it('blocks untrusted domains and adds token when needed', () => {
      expect(authService.getRedirectUrl(new URLSearchParams('redirectUrl=https://evil.com'), 'token')).toBeNull();

      expect(authService.getRedirectUrl(new URLSearchParams(), 'token')).toBeNull();

      const validUrl = authService.getRedirectUrl(
        new URLSearchParams('redirectUrl=https://internxt.com/welcome'),
        'token',
      );
      expect(validUrl).toBe('https://internxt.com/welcome?');

      const authUrl = authService.getRedirectUrl(
        new URLSearchParams('redirectUrl=https://drive.internxt.com/app?auth=true'),
        'myToken',
      );
      expect(authUrl).toContain('authToken=myToken');
      expect(authUrl).toContain('auth=true');
    });
  });

  describe('is2FANeeded', () => {
    it('checks if user has two-factor enabled', async () => {
      const mockAuthClient = {
        securityDetails: vi.fn().mockResolvedValue({ tfaEnabled: true }),
      };

      vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
        createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
      } as any);

      expect(await authService.is2FANeeded('test@example.com')).toBe(true);

      mockAuthClient.securityDetails.mockResolvedValue({ tfaEnabled: false });
      expect(await authService.is2FANeeded('test@example.com')).toBe(false);

      mockAuthClient.securityDetails.mockRejectedValue({ message: 'User not found', status: 404 });
      await expect(authService.is2FANeeded('test@example.com')).rejects.toThrow('User not found');
    });
  });

  describe('readReferalCookie', () => {
    it('reads referral code from cookies', () => {
      const originalCookie = document.cookie;

      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'REFERRAL=ABC123; other=value',
      });
      expect(authService.readReferalCookie()).toBe('ABC123');

      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other=value',
      });
      expect(authService.readReferalCookie()).toBeUndefined();

      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: originalCookie,
      });
    });
  });
});

describe('logOut', () => {
  it('should sign out user and clear their session data', async () => {
    const mockAuthClient = {
      logout: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'get').mockReturnValue('test-token');
    vi.spyOn(localStorageService, 'clear').mockImplementation(() => {});

    await authService.logOut();

    expect(mockAuthClient.logout).toHaveBeenCalledWith('test-token');
    expect(localStorageService.clear).toHaveBeenCalled();
  });

  it('should sign out user even when session has expired', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    vi.spyOn(localStorageService, 'clear').mockImplementation(() => {});

    await authService.logOut();

    expect(localStorageService.clear).toHaveBeenCalled();
  });

  it('should sign out user and redirect to specified page', async () => {
    const mockAuthClient = {
      logout: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'get').mockReturnValue('test-token');
    vi.spyOn(localStorageService, 'clear').mockImplementation(() => {});

    const loginParams = { redirect: 'dashboard' };
    await authService.logOut(loginParams);

    expect(localStorageService.clear).toHaveBeenCalled();
  });
});

describe('cancelAccount', () => {
  it('should request account closure', async () => {
    const mockAuthClient = {
      sendUserDeactivationEmail: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'get').mockReturnValue('test-token');

    await authService.cancelAccount();

    expect(mockAuthClient.sendUserDeactivationEmail).toHaveBeenCalledWith('test-token');
  });
});

describe('getSalt', () => {
  it('should retrieve user security information', async () => {
    const mockAuthClient = {
      securityDetails: vi.fn().mockResolvedValue({ encryptedSalt: encryptText('test-salt') }),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ email: 'test@test.com' } as UserSettings);

    const salt = await authService.getSalt();

    expect(salt).toBe('test-salt');
    expect(mockAuthClient.securityDetails).toHaveBeenCalledWith('test@test.com');
  });
});

describe('getPasswordDetails', () => {
  it('should prepare password verification information', async () => {
    const mockAuthClient = {
      securityDetails: vi.fn().mockResolvedValue({ encryptedSalt: encryptText('test-salt') }),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ email: 'test@test.com' } as UserSettings);

    const result = await authService.getPasswordDetails('test-password');

    expect(result).toHaveProperty('salt');
    expect(result).toHaveProperty('hashedCurrentPassword');
    expect(result).toHaveProperty('encryptedCurrentPassword');
    expect(result.salt).toBe('test-salt');
  });

  it('should show error when security information is missing', async () => {
    const mockAuthClient = {
      securityDetails: vi.fn().mockResolvedValue({ encryptedSalt: encryptText('') }),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ email: 'test@test.com' } as UserSettings);

    await expect(authService.getPasswordDetails('test-password')).rejects.toThrow(
      'Internal server error. Please reload.',
    );
  });
});

describe('recoverAccountWithBackupKey', () => {
  it('should restore account access using legacy backup key', async () => {
    const mockAuthClient = {
      legacyRecoverAccount: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    const oldBackupContent = 'test mnemonic words here for old format backup key content test';

    await authService.recoverAccountWithBackupKey('recovery-token', 'new-password', oldBackupContent);

    expect(mockAuthClient.legacyRecoverAccount).toHaveBeenCalled();
  });

  it('should restore account access using modern backup key with encryption keys', async () => {
    const mockAuthClient = {
      changePasswordWithLinkV2: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    const newBackupContent = JSON.stringify({
      mnemonic: 'test mnemonic words here for new format backup key content test with proper length',
      privateKey: Buffer.from('test-private-key').toString('base64'),
      keys: {
        ecc: Buffer.from('test-ecc-key').toString('base64'),
        kyber: 'test-kyber-key',
      },
    });

    await authService.recoverAccountWithBackupKey('recovery-token', 'new-password', newBackupContent);

    expect(mockAuthClient.changePasswordWithLinkV2).toHaveBeenCalled();
  });
});

describe('userHas2FAStored', () => {
  it('should check if user has two-factor authentication enabled', async () => {
    const mockAuthClient = {
      securityDetails: vi.fn().mockResolvedValue({ tfaEnabled: true }),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ email: 'test@test.com' } as UserSettings);

    const result = await authService.userHas2FAStored();

    expect(result.tfaEnabled).toBe(true);
    expect(mockAuthClient.securityDetails).toHaveBeenCalledWith('test@test.com');
  });
});

describe('generateNew2FA', () => {
  it('should generate new two-factor authentication QR code', async () => {
    const mockAuthClient = {
      generateTwoFactorAuthQR: vi.fn().mockResolvedValue({ qr: 'qr-code-data', secret: 'secret-key' }),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'get').mockReturnValue('test-token');

    const result = await authService.generateNew2FA();

    expect(result).toEqual({ qr: 'qr-code-data', secret: 'secret-key' });
    expect(mockAuthClient.generateTwoFactorAuthQR).toHaveBeenCalledWith('test-token');
  });
});

describe('deactivate2FA', () => {
  it('should disable two-factor authentication with valid credentials', async () => {
    const mockAuthClient = {
      disableTwoFactorAuth: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'get').mockReturnValue('test-token');

    const encryptedSalt = encryptText('test-salt');
    await authService.deactivate2FA(encryptedSalt, 'test-password', '123456');

    expect(mockAuthClient.disableTwoFactorAuth).toHaveBeenCalled();
  });
});

describe('requestUnblockAccount', () => {
  it('should send account unblock request', async () => {
    const mockAuthClient = {
      requestUnblockAccount: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    await authService.requestUnblockAccount('test@test.com');

    expect(mockAuthClient.requestUnblockAccount).toHaveBeenCalledWith('test@test.com');
  });
});

describe('unblockAccount', () => {
  it('should unblock account with valid token', async () => {
    const mockAuthClient = {
      unblockAccount: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    await authService.unblockAccount('unblock-token');

    expect(mockAuthClient.unblockAccount).toHaveBeenCalledWith('unblock-token');
  });
});

describe('authenticateUser', () => {
  it('should throw error for unknown auth method', async () => {
    const mockDispatch = vi.fn();

    await expect(
      authService.authenticateUser({
        email: 'test@test.com',
        password: 'password',
        authMethod: 'unknown' as any,
        twoFactorCode: '',
        dispatch: mockDispatch,
      }),
    ).rejects.toThrow('Unknown authMethod: unknown');
  });
});

describe('extractOneUseCredentialsForAutoSubmit', () => {
  it('should return disabled when autoSubmit is not true', () => {
    const result = authService.default.extractOneUseCredentialsForAutoSubmit(new URLSearchParams('foo=bar'));
    expect(result).toEqual({ enabled: false });
  });

  it('should extract credentials from cookie when autoSubmit is true', async () => {
    const { getCookie, setCookie } = await import('app/analytics/utils');
    const mockCredentials = {
      email: 'test@test.com',
      password: 'password123',
      redeemCode: { code: 'CODE123', provider: 'provider' },
    };

    vi.mocked(getCookie).mockReturnValue(btoa(JSON.stringify(mockCredentials)));

    const result = authService.default.extractOneUseCredentialsForAutoSubmit(new URLSearchParams('autoSubmit=true'));

    expect(result.enabled).toBe(true);
    expect(result.credentials).toEqual({
      email: 'test@test.com',
      password: 'password123',
      redeemCodeObject: { code: 'CODE123', provider: 'provider' },
    });
    expect(vi.mocked(setCookie)).toHaveBeenCalledWith('cr', '', -999);
  });

  it('should handle errors when parsing credentials', async () => {
    const { getCookie } = await import('app/analytics/utils');
    vi.mocked(getCookie).mockReturnValue('invalid-base64');

    const result = authService.default.extractOneUseCredentialsForAutoSubmit(new URLSearchParams('autoSubmit=true'));

    expect(result.enabled).toBe(true);
    expect(result.credentials).toBeUndefined();
  });
});

describe('authService default export', () => {
  it('should allow storing two-factor authentication keys and sending password reset emails', async () => {
    const mockAuthClient = {
      storeTwoFactorAuthKey: vi.fn().mockResolvedValue(undefined),
      sendChangePasswordEmail: vi.fn().mockResolvedValue(undefined),
      resetAccountWithToken: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    vi.spyOn(localStorageService, 'get').mockReturnValue('auth-token');

    await authService.default.store2FA('secret-code', '123456');
    expect(mockAuthClient.storeTwoFactorAuthKey).toHaveBeenCalledWith('secret-code', '123456', 'auth-token');

    await authService.default.sendChangePasswordEmail('test@example.com');
    expect(mockAuthClient.sendChangePasswordEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should reset account with token and new password', async () => {
    const mockAuthClient = {
      resetAccountWithToken: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue(mockAuthClient),
    } as any);

    await authService.default.resetAccountWithToken('reset-token', 'new-password');

    expect(mockAuthClient.resetAccountWithToken).toHaveBeenCalled();
  });
});
