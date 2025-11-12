/**
 * @jest-environment jsdom
 */
import { aes } from '@internxt/lib';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'app/core/services/env.service';
import localStorageService from 'app/core/services/local-storage.service';
import * as keysService from 'app/crypto/services/keys.service';
import * as pgpService from 'app/crypto/services/pgp.service';
import { encryptText, encryptTextWithKey } from 'app/crypto/services/utils';
import { userActions } from 'app/store/slices/user';
import { BackupData } from 'app/utils/backupKeyUtils';
import { validateMnemonic } from 'bip39';
import { Buffer } from 'node:buffer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SdkFactory } from 'app/core/factory/sdk';
import * as authService from './auth.service';

const mockSecret = '123456789QWERTY';
const mockMagicIv = '12345678912345678912345678912345';
const mockMagicSalt =
  '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const mockApi = 'https://mock';

beforeAll(() => {
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
  vi.mock('app/database/services/database.service', () => ({
    default: {
      clear: vi.fn(),
    },
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

  vi.mock('app/core/services/http.service', () => ({
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
  vi.resetModules();
  vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
    if (key === 'magicIv') return mockMagicIv;
    if (key === 'magicSalt') return mockMagicSalt;
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
