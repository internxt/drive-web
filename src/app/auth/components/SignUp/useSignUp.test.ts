import { renderHook } from '@testing-library/react';
import { SdkFactory } from 'app/core/factory/sdk';
import * as bip39 from 'bip39';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignUp } from './useSignUp';

vi.mock('@internxt/lib', () => ({
  aes: {
    encrypt: vi.fn().mockReturnValue('mock-encrypted'),
    decrypt: vi.fn().mockReturnValue('mock-decrypted'),
  },
}));

vi.mock('@internxt/sdk', () => ({
  Keys: vi.fn(),
  RegisterDetails: vi.fn(),
}));

vi.mock('@internxt/sdk/dist/shared/types/userSettings', () => ({
  UserSettings: vi.fn(),
}));

vi.mock('bip39', () => ({
  generateMnemonic: vi.fn().mockReturnValue('mock-mnemonic'),
}));

vi.mock('app/auth/services/auth.service', () => ({
  readReferalCookie: vi.fn().mockReturnValue('mock-referral'),
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn().mockReturnValue({
      createAuthClient: vi.fn().mockReturnValue({
        register: vi.fn().mockResolvedValue({
          token: 'mock-token',
          user: {
            userId: 'mock-user-id',
            mnemonic: 'mock-decrypted-mnemonic',
            privateKey: 'mock-private-key',
            publicKey: 'mock-public-key',
            appSumoDetails: 'mock-appSumoDetails',
            avatar: 'mock-avatar',
            keys: {
              ecc: {
                privateKey: 'mock-private-key',
                publicKey: 'mock-public-key',
              },
              kyber: {
                publicKey: '',
                privateKey: '',
              },
            },
          },
        }),
        registerPreCreatedUser: vi.fn().mockResolvedValue({
          token: 'mock-token',
          user: {
            userId: 'mock-user-id',
            mnemonic: 'mock-encrypted-mnemonic',
            privateKey: 'mock-private-key',
            publicKey: 'mock-public-key',
            keys: {
              ecc: {
                privateKey: 'mock-private-key',
                publicKey: 'mock-public-key',
              },
              kyber: {
                publicKey: '',
                privateKey: '',
              },
            },
          },
        }),
      }),
    }),
  },
}));

vi.mock('app/core/services/http.service', () => ({
  default: {
    getHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer mock-auth' }),
    convertHeadersToNativeHeaders: vi.fn().mockReturnValue({
      'Content-Type': 'application/json',
    }),
  },
}));

vi.mock('app/crypto/services/keys.service', () => ({
  getAesInitFromEnv: vi.fn().mockReturnValue('mock-aes-init'),
}));

vi.mock('app/crypto/services/keys.service', () => ({
  getKeys: vi.fn().mockResolvedValue({
    privateKeyArmored: 'mock-private-key',
    publicKeyArmored: 'mock-public-key',
    revocationCertificate: 'mock-revocation-cert',
    ecc: {
      privateKey: 'mock-private-key',
      publicKeyEncrypted: 'mock-public-key',
    },
    kyber: {
      publicKey: 'mock-private-kyber-key',
      privateKeyEncrypted: 'mock-public-kyber-key',
    },
  }),
}));

vi.mock('app/crypto/services/utils', () => ({
  decryptTextWithKey: vi.fn().mockReturnValue('mock-decrypted-mnemonic'),
  encryptTextWithKey: vi.fn().mockReturnValue('mock-encrypted-mnemonic'),
  encryptText: vi.fn().mockReturnValue('mock-encrypted-text'),
  passToHash: vi.fn().mockReturnValue({ hash: 'mock-hash', salt: 'mock-salt' }),
}));

describe('useSignUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('When the custom hook is called, then returns the correct functions', () => {
    const { result } = renderHook(() => useSignUp('activate', 'mock-referrer'));
    expect(result.current).toHaveProperty('updateInfo');
    expect(result.current).toHaveProperty('doRegister');
    expect(result.current).toHaveProperty('doRegisterPreCreatedUser');
  });

  it('when called with valid data, then it encrypts data, generates keys, and returns the expected user and token', async () => {
    const { result } = renderHook(() => useSignUp('activate', 'mock-referrer'));
    const { doRegister } = result.current;

    const response = await doRegister('test@example.com', 'mockPassword', 'mockCaptcha');

    expect(response).toEqual({
      xUser: {
        userId: 'mock-user-id',
        mnemonic: 'mock-decrypted-mnemonic',
        privateKey: 'mock-private-key',
        publicKey: 'mock-public-key',
        appSumoDetails: 'mock-appSumoDetails',
        avatar: 'mock-avatar',
        backupsBucket: undefined,
        bridgeUser: undefined,
        bucket: undefined,
        createdAt: undefined,
        credit: undefined,
        email: undefined,
        emailVerified: undefined,
        hasReferralsProgram: undefined,
        keys: {
          ecc: {
            privateKey: 'mock-private-key',
            publicKey: 'mock-public-key',
          },
          kyber: {
            publicKey: '',
            privateKey: '',
          },
        },
      },
      xToken: 'mock-token',
      mnemonic: 'mock-decrypted-mnemonic',
    });

    expect(bip39.generateMnemonic).toHaveBeenCalledWith(256);
    expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
  });

  it('when called with valid data and invitation ID, then it creates a pre-registered user and returns the expected data', async () => {
    const { result } = renderHook(() => useSignUp('activate', 'mock-referrer'));
    const { doRegisterPreCreatedUser } = result.current;

    const response = await doRegisterPreCreatedUser(
      'test@example.com',
      'mockPassword',
      'mockInvitationId',
      'mockCaptcha',
    );

    expect(response).toEqual({
      xUser: {
        userId: 'mock-user-id',
        mnemonic: 'mock-decrypted-mnemonic',
        rootFolderId: undefined,
        privateKey: 'mock-private-key',
        publicKey: 'mock-public-key',
        appSumoDetails: null,
        avatar: undefined,
        backupsBucket: undefined,
        bridgeUser: undefined,
        bucket: undefined,
        createdAt: undefined,
        credit: undefined,
        email: undefined,
        emailVerified: undefined,
        hasReferralsProgram: undefined,
        keys: {
          ecc: {
            privateKey: 'mock-private-key',
            publicKey: 'mock-public-key',
          },
          kyber: {
            publicKey: '',
            privateKey: '',
          },
        },
      },
      xToken: 'mock-token',
      mnemonic: 'mock-decrypted-mnemonic',
      lastname: undefined,
      name: undefined,
      registerCompleted: undefined,
      revocationKey: undefined,
      rootFolderUuid: undefined,
      root_folder_id: undefined,
      sharedWorkspace: undefined,
      teams: undefined,
      username: undefined,
      uuid: undefined,
    });

    expect(bip39.generateMnemonic).toHaveBeenCalledWith(256);
    expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
  });
});
