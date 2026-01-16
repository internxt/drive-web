/**
 * @jest-environment jsdom
 */
import { describe, expect, it, vi, Mock, beforeEach, beforeAll, test } from 'vitest';
import localStorageService from 'services/local-storage.service';
import { Buffer } from 'buffer';
import {
  generateNewKeys,
  encryptMessageWithPublicKey,
  hybridEncryptMessageWithPublicKey,
} from '../../crypto/services/pgp.service';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { decryptMnemonic } from './share.service';
import { stringUtils } from '@internxt/lib';

vi.mock('utils', () => ({
  generateCaptchaToken: vi.fn(() => 'mocked-captcha-token'),
}));

describe('Encryption and Decryption', () => {
  beforeAll(() => {
    globalThis.Buffer = Buffer;
    vi.mock('app/drive/services/folder.service', () => ({
      default: {},
      downloadFolderAsZip: vi.fn(),
      createFilesIterator: vi.fn(),
      createFoldersIterator: vi.fn(),
      checkIfCachedSourceIsOlder: vi.fn(),
    }));
    vi.mock('../../core/factory/sdk', () => ({
      SdkFactory: {
        getNewApiInstance: vi.fn(() => ({
          createShareClient: vi.fn(),
        })),
      },
    }));
    vi.mock('services/error.service', () => ({
      default: {
        castError: vi.fn().mockImplementation((e) => ({ message: e.message || 'Default error message' })),
        reportError: vi.fn(),
      },
    }));
    vi.mock('services/local-storage.service', () => ({
      default: {
        getUser: vi.fn(),
      },
    }));
    vi.mock('services/workspace.service', () => ({
      default: {
        getAllWorkspaceTeamSharedFolderFolders: vi.fn(),
        getAllWorkspaceTeamSharedFolderFiles: vi.fn(),
      },
    }));
    vi.mock('./DomainManager', () => ({ domainManager: vi.fn() }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  async function getMockUser(
    keys: {
      privateKeyArmored: string;
      publicKeyArmored: string;
      revocationCertificate: string;
      publicKyberKeyBase64: string;
      privateKyberKeyBase64: string;
    },
    encryptedMnemonicInBase64: string,
  ): Promise<UserSettings> {
    const mockUser: UserSettings = {
      uuid: 'mock-uuid',
      email: 'mock@test.com',
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
      mnemonic: encryptedMnemonicInBase64,
      userId: 'mock-user-id',
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
      publicKey: keys.publicKeyArmored,
      revocationKey: keys.revocationCertificate,
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: keys.privateKyberKeyBase64,
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
  it('should decrypt mnemonic encrypted without kyber', async () => {
    const mnemonic =
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
    });
    const encryptedMnemonicInBase64 = btoa(encriptedMnemonic as string);

    const mockUser = await getMockUser(keys, encryptedMnemonicInBase64);

    (localStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(localStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(localStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  it('should decrypt mnemonic encrypted with kyber', async () => {
    const mnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await hybridEncryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
      publicKyberKeyBase64: keys.publicKyberKeyBase64,
    });

    const mockUser = await getMockUser(keys, encriptedMnemonic);

    (localStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(localStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(localStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  it('should decrypt mnemonic encrypted without key field', async () => {
    const mnemonic =
      'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
    });
    const encryptedMnemonicInBase64 = btoa(encriptedMnemonic as string);

    const mockOldUser: Partial<UserSettings> = {
      uuid: 'mock-uuid',
      email: 'mock@test.com',
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
      mnemonic: encryptedMnemonicInBase64,
      userId: 'mock-user-id',
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
      publicKey: keys.publicKeyArmored,
      revocationKey: keys.revocationCertificate,
      appSumoDetails: null,
      registerCompleted: false,
      hasReferralsProgram: false,
      createdAt: new Date(),
      avatar: null,
      emailVerified: false,
    };

    const mockUser = mockOldUser as UserSettings;

    (localStorageService.getUser as Mock).mockReturnValue(mockUser);
    expect(localStorageService.getUser() as UserSettings).toEqual(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(localStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  it('should return the same UUID if the input is a valid UUIDv4', () => {
    const validUuid = 'f32a91da-c799-4e13-aa17-8c4d9e0323c9';
    const result = stringUtils.decodeV4Uuid(validUuid);
    expect(result).toBe(validUuid);
  });

  it('should convert a Base64 URL-safe string to a UUID if the input is not a valid UUIDv4', () => {
    const base64UrlSafeString = '8yqR2seZThOqF4xNngMjyQ';
    const expectedUuid = 'f32a91da-c799-4e13-aa17-8c4d9e0323c9';

    const result = stringUtils.decodeV4Uuid(base64UrlSafeString);
    expect(result).toBe(expectedUuid);
  });

  it('should encode a valid UUID to a Base64 URL-safe string', () => {
    const validUuid = 'f32a91da-c799-4e13-aa17-8c4d9e0323c9';
    const expectedEncodedString = '8yqR2seZThOqF4xNngMjyQ';

    const result = stringUtils.encodeV4Uuid(validUuid);

    expect(result).toBe(expectedEncodedString);
  });

  it('should throw an error for an invalid UUID format', () => {
    const invalidUuid = 'invalid-uuid-string';
    expect(() => stringUtils.encodeV4Uuid(invalidUuid)).toThrowError();
  });
});

describe('Inviting user to Shared Folder', () => {
  const mockProps = {
    itemId: 'test-item-id',
    itemType: 'folder' as const,
    sharedWith: 'user@example.com',
    encryptionKey: 'test-encryption-key',
    encryptionAlgorithm: 'test-algorithm',
    roleId: 'test-role-id',
    notifyUser: true,
    notificationMessage: 'You have been invited',
  };

  const mockSharingInvite = {
    id: 'invite-id',
    itemId: 'test-item-id',
    itemType: 'folder',
    sharedWith: 'user@example.com',
    encryptionKey: 'test-encryption-key',
    encryptionAlgorithm: 'test-algorithm',
    roleId: 'test-role-id',
    type: 'SELF',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When inviting a user, then the captcha token should be generated and included when creating the client', async () => {
    const { generateCaptchaToken } = await import('utils');
    const { SdkFactory } = await import('../../core/factory/sdk');
    const { inviteUserToSharedFolder } = await import('./share.service');

    const mockInviteUserToSharedFolderFn = vi.fn().mockResolvedValue(mockSharingInvite);
    const mockCreateShareClientFn = vi.fn(() => ({
      inviteUserToSharedFolder: mockInviteUserToSharedFolderFn,
    }));

    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    await inviteUserToSharedFolder(mockProps);

    expect(generateCaptchaToken).toHaveBeenCalledTimes(1);
    expect(mockCreateShareClientFn).toHaveBeenCalledWith('mocked-captcha-token');
    expect(mockInviteUserToSharedFolderFn).toHaveBeenCalledWith({ ...mockProps });
  });

  test('When an error occurs while inviting a user, then an error indicating so is thrown', async () => {
    const { SdkFactory } = await import('../../core/factory/sdk');
    const { inviteUserToSharedFolder } = await import('./share.service');
    const errorService = (await import('services/error.service')).default;

    const originalError = new Error('API Error');
    const mockInviteUserToSharedFolderFn = vi.fn().mockRejectedValue(originalError);
    const mockCreateShareClientFn = vi.fn(() => ({
      inviteUserToSharedFolder: mockInviteUserToSharedFolderFn,
    }));

    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    await expect(inviteUserToSharedFolder(mockProps)).rejects.toEqual({
      message: 'API Error',
    });
    expect(errorService.castError).toHaveBeenCalledWith(originalError);
  });
});
