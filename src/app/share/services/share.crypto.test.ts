import { describe, expect, vi, Mock, beforeEach, test } from 'vitest';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { generateNewKeys, encryptMessageWithPublicKey } from '../../crypto/services/pgp.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import notificationsService from '../../notifications/services/notifications.service';
import {
  decryptMnemonic,
  encryptMnemonic,
  encryptBucketKey,
  decryptBucketKey,
  decryptSharingKey,
} from './share.crypto';
import { isBucketKeyCiphertext } from '../../crypto/services/pgp.service';
import { generateFileBucketKey } from 'app/network/crypto';

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => ({
      message: typeof e === 'string' ? e : e.message || 'Default error message',
      requestId: 'test-request-id',
    })),
    reportError: vi.fn(),
  },
}));

vi.mock('services/encrypted-storage.service', () => ({
  default: {
    getUser: vi.fn(),
  },
}));

async function getMockUser(
  keys: {
    privateKeyArmored: string;
    publicKeyArmored: string;
    publicKyberKeyBase64: string;
    privateKyberKeyBase64: string;
  },
  encryptedMnemonicInBase64: string,
): Promise<UserSettings> {
  const mockUser: UserSettings = {
    uuid: 'mock-uuid',
    email: 'mock@test.com',
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

describe('should decrypt mnemonics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const mnemonic =
    'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state';
  const bucketId = '0123456789abcdef0123456789abcdef01234567';

  test('should decrypt mnemonic encrypted without kyber', async () => {
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMessageWithPublicKey({
      message: mnemonic,
      publicKeyInBase64: keys.publicKeyArmored,
    });
    const encryptedMnemonicInBase64 = btoa(encriptedMnemonic as string);

    const mockUser = await getMockUser(keys, encryptedMnemonicInBase64);

    (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(encryptedStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  test('should decrypt mnemonic encrypted with kyber', async () => {
    const keys = await generateNewKeys();
    const encriptedMnemonic = await encryptMnemonic(mnemonic, keys.publicKeyArmored, keys.publicKyberKeyBase64);

    const mockUser = await getMockUser(keys, encriptedMnemonic);

    (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);

    const ownerMnemonic = await decryptMnemonic(mockUser.mnemonic);
    expect(encryptedStorageService.getUser).toHaveBeenCalled();
    expect(ownerMnemonic).toEqual(mnemonic);
  });

  describe('bucket key encryption/decryption', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test('should encrypt and decrypt a bucket key roundtrip without kyber', async () => {
      const keys = await generateNewKeys();

      const encrypted = await encryptBucketKey(mnemonic, bucketId, keys.publicKeyArmored, '');

      const mockUser = await getMockUser(keys, 'unused');
      (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);

      const decrypted = await decryptBucketKey(encrypted);
      const expectedBucketKey = await generateFileBucketKey(mnemonic, bucketId);

      expect(decrypted).toBeDefined();
      expect(Buffer.from(decrypted as Uint8Array)).toEqual(expectedBucketKey.subarray(0, 32));
    });

    test('should encrypt and decrypt a bucket key roundtrip with kyber', async () => {
      const keys = await generateNewKeys();
      const encrypted = await encryptBucketKey(mnemonic, bucketId, keys.publicKeyArmored, keys.publicKyberKeyBase64);

      const mockUser = await getMockUser(keys, 'unused');
      (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);

      const decrypted = await decryptBucketKey(encrypted);
      const expectedBucketKey = await generateFileBucketKey(mnemonic, bucketId);

      expect(decrypted).toBeDefined();
      expect(Buffer.from(decrypted as Uint8Array)).toEqual(expectedBucketKey.subarray(0, 32));
    });

    test('isBucketKeyCiphertext returns true for a hybrid bucket key ciphertext', async () => {
      const keys = await generateNewKeys();
      const encrypted = await encryptBucketKey(mnemonic, bucketId, keys.publicKeyArmored, keys.publicKyberKeyBase64);

      expect(isBucketKeyCiphertext(encrypted)).toBe(true);
    });

    test('isBucketKeyCiphertext returns false for a plain mnemonic ciphertext', async () => {
      const keys = await generateNewKeys();
      const encrypted = await encryptMnemonic('some differnt mnemonic', keys.publicKeyArmored);

      expect(isBucketKeyCiphertext(btoa(encrypted as unknown as string))).toBe(false);
    });

    test('decryptBucketKey returns undefined and notifies when user is not found', async () => {
      (encryptedStorageService.getUser as Mock).mockResolvedValue(undefined);
      const showSpy = vi.spyOn(notificationsService, 'show');

      const result = await decryptBucketKey('anything');

      expect(result).toBeUndefined();
      expect(showSpy).toHaveBeenCalled();
    });

    test('decryptBucketKey returns undefined and notifies on malformed ciphertext', async () => {
      const keys = await generateNewKeys();
      const mockUser = await getMockUser(keys, 'unused');
      (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);
      const showSpy = vi.spyOn(notificationsService, 'show');

      const result = await decryptBucketKey('not-a-valid-ciphertext');

      expect(result).toBeUndefined();
      expect(showSpy).toHaveBeenCalled();
    });
  });

  describe('decryptSharingKey', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    test('routes to bucket key decryption when ciphertext is a bucket key', async () => {
      const keys = await generateNewKeys();
      const encrypted = await encryptBucketKey(mnemonic, bucketId, keys.publicKeyArmored, keys.publicKyberKeyBase64);

      const mockUser = await getMockUser(keys, 'unused');
      (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);

      const result = await decryptSharingKey(encrypted);

      expect(result).toBeDefined();
      expect(result?.bucketKey).toBeDefined();
      expect(result?.mnemonic).toBeUndefined();
    });

    test('routes to mnemonic decryption when ciphertext is not a bucket key', async () => {
      const keys = await generateNewKeys();
      const encrypted = await encryptMnemonic(mnemonic, keys.publicKeyArmored);

      const mockUser = await getMockUser(keys, encrypted);
      (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);

      const result = await decryptSharingKey(encrypted);

      expect(result).toBeDefined();
      expect(result?.mnemonic).toEqual(mnemonic);
      expect(result?.bucketKey).toBeUndefined();
    });

    test('returns undefined when bucket key decryption fails', async () => {
      const keys = await generateNewKeys();
      const mockUser = await getMockUser(keys, 'unused');
      (encryptedStorageService.getUser as Mock).mockResolvedValue(mockUser);
      vi.spyOn(notificationsService, 'show');

      const malformed = 'SHlicmlkQnVja2V0S2V5$onlyonepart';

      const result = await decryptSharingKey(malformed);

      expect(result).toBeUndefined();
    });
  });
});
