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
import shareService, { decryptMnemonic, derivePublicSharingKey, getPublicShareLink } from './share.service';
import { stringUtils, aes } from '@internxt/lib';
import notificationsService from 'app/notifications/services/notifications.service';
import { SharedFiles, SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { generateFileBucketKey } from 'app/network/crypto';
import { domainManager } from './DomainManager';
import { copyTextToClipboard } from 'utils/copyToClipboard.utils';
import referralService from 'services/referral.service';
import { ToastType } from 'app/notifications/services/notifications.service';

vi.mock('utils/copyToClipboard.utils', () => ({
  copyTextToClipboard: vi.fn(),
}));

vi.mock('services/referral.service', () => ({
  default: {
    trackShareCreated: vi.fn(),
  },
}));

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
        castError: vi
          .fn()
          .mockImplementation((e) => ({ message: e.message || 'Default error message', requestId: 'test-request-id' })),
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
    vi.mock('./DomainManager', () => ({ domainManager: { getDomainsList: vi.fn() } }));
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

    await expect(inviteUserToSharedFolder(mockProps)).rejects.toEqual(
      expect.objectContaining({ message: originalError.message }),
    );
    expect(errorService.castError).toHaveBeenCalledWith(originalError);
  });
});

describe('Get shared link', () => {
  test('When an error occurs fetching a shared link, then a notification is shown', async () => {
    vi.spyOn(shareService, 'createPublicSharingItem').mockRejectedValue(new Error('Unexpected error'));
    const showNotificationSpy = vi.spyOn(notificationsService, 'show');

    await getPublicShareLink('uuid', 'file');

    expect(showNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'test-request-id' }));
  });
});

describe('Get public shared link', async () => {
  beforeAll(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const bucket = 'test bucket';
  const mnemonic = 'test mnemonic';
  const mockPlainCode = 'mock plain code';
  const bucketKey = await generateFileBucketKey(mnemonic, bucket);
  const bucketKeyHex = Buffer.from(bucketKey.subarray(0, 32)).toString('hex');
  const encryptedCode = aes.encrypt(mockPlainCode, bucketKeyHex);

  const mockSharedFile = {
    bucket,
  } as SharedFiles;

  const validSharingId = 'f32a91da-c799-4e13-aa17-8c4d9e0323c9';

  const mockSharingMeta = {
    id: validSharingId,
    itemId: 'mock item id',
    itemType: 'file',
    ownerId: 'mock owner id',
    sharedWith: 'user id',
    encryptionKey: 'mock encryption key',
    encryptedCode: encryptedCode,
    encryptedPassword: null,
    encryptionAlgorithm: 'inxt-v3',
    createdAt: new Date(),
    updatedAt: new Date(),
    type: 'public',
    item: mockSharedFile,
    itemToken: 'mock token',
  } as SharingMeta;

  test('When encrypted code does no change, do not decrypt code', async () => {
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);
    const spyDecrypt = vi.spyOn(aes, 'decrypt');

    const { SdkFactory } = await import('../../core/factory/sdk');
    const mockCreatePublicSharingItemFn = vi.fn(async (payload) => {
      return {
        ...mockSharingMeta,
        encryptedCode: payload.encryptedCode,
      };
    });

    const mockCreateShareClientFn = vi.fn(() => ({
      createSharing: mockCreatePublicSharingItemFn,
    }));

    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    const { createPublicShareFromOwnerUser } = await import('./share.service');
    const { publicSharingItemData, plainCode } = await createPublicShareFromOwnerUser('uuid', 'file');

    expect(plainCode).toBeDefined();
    expect(publicSharingItemData).toBeDefined();
    expect(spyDecrypt).not.toHaveBeenCalled();
  });

  test('When user is invited and mnemonic is available in sharing v2, decrypt the mnemonic and use it', async () => {
    const keys = await generateNewKeys();
    const publicKeyInBase64 = keys.publicKeyArmored;
    const publicKyberKeyBase64 = keys.publicKyberKeyBase64;
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({
      bucket,
      mnemonic,
      uuid: 'test-uuid',
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
    } as UserSettings);
    const spyDecrypt = vi.spyOn(aes, 'decrypt');
    const mockDifferentMnemonic = 'mock mnemonic';
    const encryptedMnemonic = await hybridEncryptMessageWithPublicKey({
      message: mockDifferentMnemonic,
      publicKeyInBase64,
      publicKyberKeyBase64,
    });
    const { SdkFactory } = await import('../../core/factory/sdk');
    const mockSharingMetaWithEncryptedMnemonic = {
      ...mockSharingMeta,
      encryptedCode: aes.encrypt(mockPlainCode, mockDifferentMnemonic),
      encryptionAlgorithm: 'inxt-v2',
    };

    const mockCreatePublicSharingItemFn = vi.fn().mockResolvedValue(mockSharingMetaWithEncryptedMnemonic);
    const mockCreateShareClientFn = vi.fn(() => ({
      createSharing: mockCreatePublicSharingItemFn,
    }));

    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    const { createPublicShareFromOwnerUser } = await import('./share.service');
    const { publicSharingItemData, plainCode } = await createPublicShareFromOwnerUser('uuid', 'file', {
      encryptedMnemonic,
    });

    expect(plainCode).toBeDefined();
    expect(publicSharingItemData).toBeDefined();
    expect(spyDecrypt).toHaveBeenCalled();
    expect(plainCode).toBe(mockPlainCode);
  });

  test('When user is invited and mnemonic is available in sharing v3, decrypt the mnemonic and compute bucketKey from it', async () => {
    const keys = await generateNewKeys();
    const publicKeyInBase64 = keys.publicKeyArmored;
    const publicKyberKeyBase64 = keys.publicKyberKeyBase64;
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({
      bucket,
      mnemonic,
      uuid: 'test-uuid',
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
    } as UserSettings);
    const spyDecrypt = vi.spyOn(aes, 'decrypt');
    const mockDifferentMnemonic = 'mock mnemonic';
    const encryptedMnemonic = await hybridEncryptMessageWithPublicKey({
      message: mockDifferentMnemonic,
      publicKeyInBase64,
      publicKyberKeyBase64,
    });
    const newBucketKey = await generateFileBucketKey(mockDifferentMnemonic, bucket);
    const newBucketKeyHex = Buffer.from(newBucketKey.subarray(0, 32)).toString('hex');
    const { SdkFactory } = await import('../../core/factory/sdk');
    const mockSharingMetaWithEncryptedMnemonic = {
      ...mockSharingMeta,
      encryptedCode: aes.encrypt(mockPlainCode, newBucketKeyHex),
    };

    const mockCreatePublicSharingItemFn = vi.fn().mockResolvedValue(mockSharingMetaWithEncryptedMnemonic);
    const mockCreateShareClientFn = vi.fn(() => ({
      createSharing: mockCreatePublicSharingItemFn,
    }));

    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    const { createPublicShareFromOwnerUser } = await import('./share.service');
    const { publicSharingItemData, plainCode } = await createPublicShareFromOwnerUser('uuid', 'file', {
      encryptedMnemonic,
    });

    expect(plainCode).toBeDefined();
    expect(publicSharingItemData).toBeDefined();
    expect(spyDecrypt).toHaveBeenCalled();
    expect(plainCode).toBe(mockPlainCode);
  });

  test('When encrypted code changes, decrypt code', async () => {
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);
    const spyDecrypt = vi.spyOn(aes, 'decrypt');

    const { SdkFactory } = await import('../../core/factory/sdk');
    const mockCreatePublicSharingItemFn = vi.fn().mockResolvedValue(mockSharingMeta);
    const mockCreateShareClientFn = vi.fn(() => ({
      createSharing: mockCreatePublicSharingItemFn,
    }));

    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    const { createPublicShareFromOwnerUser } = await import('./share.service');
    const { publicSharingItemData, plainCode } = await createPublicShareFromOwnerUser('uuid', 'file');

    expect(plainCode).toBeDefined();
    expect(publicSharingItemData).toBeDefined();
    expect(spyDecrypt).toHaveBeenCalled();
    expect(plainCode).toBe(mockPlainCode);
  });
  test('When an error occurs fetching a shared link, then a notification is shown', async () => {
    vi.spyOn(shareService, 'createPublicShareFromOwnerUser').mockRejectedValue(new Error('Unexpected error'));
    const showNotificationSpy = vi.spyOn(notificationsService, 'show');

    await getPublicShareLink('uuid', 'file');

    expect(showNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'test-request-id' }));
  });

  test('When domains list is not empty, use it', async () => {
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);

    const { SdkFactory } = await import('../../core/factory/sdk');
    const mockCreatePublicSharingItemFn = vi.fn().mockResolvedValue(mockSharingMeta);
    const mockCreateShareClientFn = vi.fn(() => ({
      createSharing: mockCreatePublicSharingItemFn,
    }));
    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    vi.mocked(domainManager.getDomainsList).mockReturnValue(['https://mock-domain.com']);
    vi.mocked(copyTextToClipboard).mockResolvedValue(undefined);

    const showNotificationSpy = vi.spyOn(notificationsService, 'show');
    const trackShareCreatedSpy = vi.spyOn(referralService, 'trackShareCreated');

    const { getPublicShareLink } = await import('./share.service');
    const result = await getPublicShareLink('uuid', 'file');

    expect(copyTextToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('https://mock-domain.com/sh/file/8yqR2seZThOqF4xNngMjyQ/'),
    );
    expect(showNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Success }));
    expect(trackShareCreatedSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({ id: validSharingId }));
  });

  test('When domains list is empty, use the fallback domain', async () => {
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);

    const { SdkFactory } = await import('../../core/factory/sdk');
    const mockCreatePublicSharingItemFn = vi.fn().mockResolvedValue(mockSharingMeta);
    const mockCreateShareClientFn = vi.fn(() => ({
      createSharing: mockCreatePublicSharingItemFn,
    }));
    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    vi.mocked(domainManager.getDomainsList).mockReturnValue([]);
    vi.mocked(copyTextToClipboard).mockResolvedValue(undefined);

    const { getPublicShareLink } = await import('./share.service');
    await getPublicShareLink('uuid', 'file');

    expect(copyTextToClipboard).toHaveBeenCalledWith(
      expect.stringContaining(`${window.location.origin}/sh/file/8yqR2seZThOqF4xNngMjyQ/`),
    );
  });

  test('When copyTextToClipboard rejects, an error notification is shown and the error is reported', async () => {
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);

    const { SdkFactory } = await import('../../core/factory/sdk');
    const mockCreatePublicSharingItemFn = vi.fn().mockResolvedValue(mockSharingMeta);
    const mockCreateShareClientFn = vi.fn(() => ({
      createSharing: mockCreatePublicSharingItemFn,
    }));
    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createShareClient: mockCreateShareClientFn,
    } as any);

    vi.mocked(domainManager.getDomainsList).mockReturnValue(['https://mock-domain.com']);
    vi.mocked(copyTextToClipboard).mockRejectedValueOnce(new Error('Clipboard unavailable'));

    const errorService = (await import('services/error.service')).default;
    const showNotificationSpy = vi.spyOn(notificationsService, 'show');

    const { getPublicShareLink } = await import('./share.service');
    const result = await getPublicShareLink('uuid', 'file');

    expect(result).toBeUndefined();
    expect(showNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: ToastType.Error, requestId: 'test-request-id' }),
    );
    expect(errorService.reportError).toHaveBeenCalled();
  });
});

describe('decryptPublicSharingCodeWithOwner', () => {
  const bucket = 'test bucket';
  const mnemonic = 'test mnemonic';
  const plainCode = 'test plain code';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When encryptionAlgorithm is NEW_SHARING_VERSION, then code is decrypted using bucket key', async () => {
    const bucketKey = await generateFileBucketKey(mnemonic, bucket);
    const bucketKeyHex = Buffer.from(bucketKey.subarray(0, 32)).toString('hex');
    const encryptedCode = aes.encrypt(plainCode, bucketKeyHex);

    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);

    const result = await shareService.decryptPublicSharingCodeWithOwner(encryptedCode, 'inxt-v3');

    expect(result).toBe(plainCode);
  });

  test('When encryptionAlgorithm is not NEW_SHARING_VERSION, then code is decrypted using mnemonic directly', async () => {
    const encryptedCode = aes.encrypt(plainCode, mnemonic);
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);

    const result = await shareService.decryptPublicSharingCodeWithOwner(encryptedCode, 'inxt-v2');
    expect(result).toBe(plainCode);
  });

  test('When decryption fails, then an error is thrown', async () => {
    vi.spyOn(localStorageService, 'getUser').mockReturnValue({ bucket, mnemonic } as UserSettings);

    await expect(shareService.decryptPublicSharingCodeWithOwner('bad-encrypted-code', 'inxt-v3')).rejects.toThrow(
      'Length 0, cannot decrypt',
    );
  });
});

describe('derivePublicSharingKey', () => {
  const code = 'plain-code';

  test('When sharingVersion is the new sharing version, then the decrypted hex is returned as bucketKey', () => {
    const bucketKeyHex = Buffer.from('public-sharing-bucket-key-32-byt').toString('hex');
    const encryptionKey = aes.encrypt(bucketKeyHex, code);

    const result = derivePublicSharingKey({ encryptionKey, code, sharingVersion: 'inxt-v3' });

    expect(result).toEqual({ bucketKey: Buffer.from(bucketKeyHex, 'hex') });
  });

  test('When sharingVersion is not the new sharing version, then the decrypted value is returned as mnemonic', () => {
    const mnemonic = 'test mnemonic phrase';
    const encryptionKey = aes.encrypt(mnemonic, code);

    const result = derivePublicSharingKey({ encryptionKey, code, sharingVersion: 'inxt-v2' });

    expect(result).toEqual({ mnemonic });
  });

  test('When the code does not match the encryption key, then an error is thrown', () => {
    expect(() =>
      derivePublicSharingKey({ encryptionKey: 'bad-encrypted-key', code, sharingVersion: 'inxt-v3' }),
    ).toThrow();
  });
});
