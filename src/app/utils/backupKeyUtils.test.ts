import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import { getKeys } from 'app/crypto/services/keys.service';
import { encryptText, encryptTextWithKey, passToHash } from 'app/crypto/services/utils';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { validateMnemonic } from 'bip39';
import { saveAs } from 'file-saver';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptMessageWithPublicKey, hybridEncryptMessageWithPublicKey } from '../crypto/services/pgp.service';
import {
  BackupData,
  detectBackupKeyFormat,
  handleExportBackupKey,
  prepareOldBackupRecoverPayloadForBackend,
} from './backupKeyUtils';

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('app/core/services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Error: 'error',
    Success: 'success',
  },
}));

vi.mock('bip39', () => ({
  validateMnemonic: vi.fn(),
}));

vi.mock('app/crypto/services/keys.service', () => ({
  getKeys: vi.fn(),
}));

vi.mock('app/crypto/services/utils', () => ({
  encryptText: vi.fn(),
  encryptTextWithKey: vi.fn(),
  passToHash: vi.fn(),
}));

vi.mock('../crypto/services/pgp.service', () => ({
  encryptMessageWithPublicKey: vi.fn(),
  hybridEncryptMessageWithPublicKey: vi.fn(),
}));

describe('backupKeyUtils', () => {
  const mockTranslate = vi.fn((key) => `Translated: ${key}`);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('handleExportBackupKey', () => {
    it('should export backup key successfully', () => {
      const mockMnemonic =
        'whip pipe sphere rail witness sting hawk project east return unhappy focus shop dry midnight frog critic lion horror slide luxury consider vibrant timber';
      const mockUser = {
        privateKey: 'test-private-key',
        keys: {
          ecc: {
            privateKey: 'test-ecc-private-key',
          },
          kyber: {
            privateKey: 'test-kyber-private-key',
          },
        },
        userId: 'test-user-id',
        uuid: 'test-uuid',
        email: 'test@example.com',
        name: 'Test User',
        lastname: 'User',
        username: 'testuser',
        bridgeUser: 'test-bridge-user',
        bucket: 'test-bucket',
        backupsBucket: null,
        root_folder_id: 0,
        rootFolderId: 'test-root-folder-id',
        rootFolderUuid: 'test-root-folder-uuid',
        sharedWorkspace: false,
        credit: 0,
        publicKey: 'test-public-key',
        revocationKey: 'test-revocation-key',
        appSumoDetails: null,
        registerCompleted: false,
        hasReferralsProgram: false,
        createdAt: new Date(),
        avatar: null,
        emailVerified: false,
      } as UserSettings;

      vi.mocked(localStorageService.get).mockReturnValue(mockMnemonic);
      vi.mocked(localStorageService.getUser).mockReturnValue(mockUser);

      handleExportBackupKey(mockTranslate);

      expect(localStorageService.get).toHaveBeenCalledWith('xMnemonic');
      expect(localStorageService.getUser).toHaveBeenCalled();

      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'INTERNXT-BACKUP-KEY.txt');

      const blobCall = vi.mocked(saveAs).mock.calls[0][0] as Blob;
      expect(blobCall.type).toBe('text/plain');

      expect(notificationsService.show).toHaveBeenCalledWith({
        text: mockTranslate('views.account.tabs.security.backupKey.success'),
        type: ToastType.Success,
      });
    });

    it('should handle missing mnemonic', () => {
      vi.mocked(localStorageService.get).mockReturnValue(null);
      vi.mocked(localStorageService.getUser).mockReturnValue({} as any);

      handleExportBackupKey(mockTranslate);

      expect(saveAs).not.toHaveBeenCalled();

      expect(notificationsService.show).toHaveBeenCalledWith({
        text: mockTranslate('views.account.tabs.security.backupKey.error'),
        type: ToastType.Error,
      });
    });

    it('should handle missing user', () => {
      vi.mocked(localStorageService.get).mockReturnValue('test-mnemonic');
      vi.mocked(localStorageService.getUser).mockReturnValue(null);

      handleExportBackupKey(mockTranslate);

      expect(saveAs).not.toHaveBeenCalled();

      expect(notificationsService.show).toHaveBeenCalledWith({
        text: mockTranslate('views.account.tabs.security.backupKey.error'),
        type: ToastType.Error,
      });
    });

    it('should handle missing key properties', () => {
      const mockMnemonic = 'test mnemonic';
      const mockUser = {
        privateKey: 'test-private-key',
        userId: 'test-user-id',
        uuid: 'test-uuid',
        email: 'test@example.com',
        name: 'Test User',
        lastname: 'User',
        username: 'testuser',
        bridgeUser: 'test-bridge-user',
        bucket: 'test-bucket',
        backupsBucket: null,
        root_folder_id: 0,
        rootFolderId: 'test-root-folder-id',
        rootFolderUuid: 'test-root-folder-uuid',
        sharedWorkspace: false,
        credit: 0,
        publicKey: 'test-public-key',
        revocationKey: 'test-revocation-key',
        appSumoDetails: null,
        registerCompleted: false,
        hasReferralsProgram: false,
        createdAt: new Date(),
        avatar: null,
        emailVerified: false,
      } as UserSettings;

      vi.mocked(localStorageService.get).mockReturnValue(mockMnemonic);
      vi.mocked(localStorageService.getUser).mockReturnValue(mockUser);

      handleExportBackupKey(mockTranslate);

      expect(saveAs).toHaveBeenCalled();

      expect(notificationsService.show).toHaveBeenCalledWith({
        text: mockTranslate('views.account.tabs.security.backupKey.success'),
        type: ToastType.Success,
      });
    });
  });

  describe('detectBackupKeyFormat', () => {
    it('should detect new backup key format with full data', () => {
      const mockBackupData: BackupData = {
        mnemonic: 'test mnemonic',
        privateKey: 'test-private-key',
        keys: {
          ecc: 'test-ecc-key',
          kyber: 'test-kyber-key',
        },
      };

      const backupKeyContent = JSON.stringify(mockBackupData);

      const result = detectBackupKeyFormat(backupKeyContent);

      expect(result).toEqual({
        type: 'new',
        mnemonic: mockBackupData.mnemonic,
        backupData: mockBackupData,
      });
    });

    it('should detect old backup key format (mnemonic only)', () => {
      const mockMnemonic = 'test mnemonic';

      vi.mocked(validateMnemonic).mockReturnValueOnce(true);

      const result = detectBackupKeyFormat(mockMnemonic);

      expect(result).toEqual({
        type: 'old',
        mnemonic: mockMnemonic,
      });
    });

    it('should throw error for invalid backup key format', () => {
      const invalidContent = 'invalid content';

      vi.mocked(validateMnemonic).mockReturnValueOnce(false);

      expect(() => detectBackupKeyFormat(invalidContent)).toThrow('Invalid backup key format');
    });

    it('should handle partial JSON (with mnemonic but without other keys)', () => {
      const partialData = JSON.stringify({
        mnemonic: 'test mnemonic',
        privateKey: 'test-private-key',
        // keys property is missing
      });

      vi.mocked(validateMnemonic).mockReturnValueOnce(false);

      expect(() => detectBackupKeyFormat(partialData)).toThrow('Invalid backup key format');
    });

    it('should handle JSON with correct format but invalid data', () => {
      const invalidData = JSON.stringify({
        mnemonic: 'test mnemonic',
        privateKey: 'test-private-key',
        keys: {
          // ecc is missing
          kyber: 'test-kyber-key',
        },
      });

      vi.mocked(validateMnemonic).mockReturnValueOnce(false);

      expect(() => detectBackupKeyFormat(invalidData)).toThrow('Invalid backup key format');
    });

    it('should reject invalid mnemonic in old format', () => {
      const invalidMnemonic = 'invalid mnemonic phrase';

      vi.mocked(validateMnemonic).mockReturnValueOnce(false);

      expect(() => detectBackupKeyFormat(invalidMnemonic)).toThrow('Invalid backup key format');
    });
  });

  describe('prepareOldBackupRecoverPayloadForBackend', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should prepare recovery payload correctly', async () => {
      const mockMnemonic =
        'whip pipe sphere rail witness sting hawk project east return unhappy focus shop dry midnight frog critic lion horror slide luxury consider vibrant timber';
      const mockPassword = 'test-password';
      const mockToken = 'test-token';

      const mockHashObj = { hash: 'test-hash', salt: 'test-salt' };
      vi.mocked(passToHash).mockReturnValue(mockHashObj);
      vi.mocked(validateMnemonic).mockReturnValue(true);

      vi.mocked(encryptText).mockImplementation((text) => `encrypted-${text}`);
      vi.mocked(encryptTextWithKey).mockImplementation((text) => `encrypted-with-key-${text}`);

      const mockGeneratedKeys = {
        publicKey: 'test-public-key',
        privateKeyEncrypted: 'test-private-key-encrypted',
        revocationCertificate: 'test-revocation-cert',
        ecc: {
          publicKey: 'test-ecc-public-key',
          privateKeyEncrypted: 'test-ecc-private-key-encrypted',
        },
        kyber: {
          publicKey: 'test-kyber-public-key',
          privateKeyEncrypted: 'test-kyber-private-key-encrypted',
        },
      };
      vi.mocked(getKeys).mockResolvedValue(mockGeneratedKeys);

      vi.mocked(encryptMessageWithPublicKey).mockResolvedValue('ecc-encrypted-mnemonic');
      vi.mocked(hybridEncryptMessageWithPublicKey).mockResolvedValue('hybrid-encrypted-mnemonic');

      const result = await prepareOldBackupRecoverPayloadForBackend({
        mnemonic: mockMnemonic,
        password: mockPassword,
        token: mockToken,
      });

      expect(passToHash).toHaveBeenCalledWith({ password: mockPassword });
      expect(encryptText).toHaveBeenCalledWith(mockHashObj.hash);
      expect(encryptText).toHaveBeenCalledWith(mockHashObj.salt);
      expect(encryptTextWithKey).toHaveBeenCalledWith(mockMnemonic, mockPassword);
      expect(getKeys).toHaveBeenCalledWith(mockPassword);

      expect(encryptMessageWithPublicKey).toHaveBeenCalledWith({
        message: mockMnemonic,
        publicKeyInBase64: mockGeneratedKeys.publicKey,
      });

      expect(hybridEncryptMessageWithPublicKey).toHaveBeenCalledWith({
        message: mockMnemonic,
        publicKeyInBase64: mockGeneratedKeys.publicKey,
        publicKyberKeyBase64: mockGeneratedKeys.kyber.publicKey,
      });

      expect(result).toEqual({
        token: mockToken,
        encryptedPassword: 'encrypted-test-hash',
        encryptedSalt: 'encrypted-test-salt',
        encryptedMnemonic: 'encrypted-with-key-' + mockMnemonic,
        eccEncryptedMnemonic: 'ZWNjLWVuY3J5cHRlZC1tbmVtb25pYw==',
        kyberEncryptedMnemonic: 'hybrid-encrypted-mnemonic',
        keys: {
          ecc: {
            public: mockGeneratedKeys.ecc.publicKey,
            private: mockGeneratedKeys.ecc.privateKeyEncrypted,
            revocationKey: mockGeneratedKeys.revocationCertificate,
          },
          kyber: {
            public: mockGeneratedKeys.kyber.publicKey,
            private: mockGeneratedKeys.kyber.privateKeyEncrypted,
          },
        },
      });
    });

    it('should throw error if mnemonic is missing', async () => {
      await expect(
        prepareOldBackupRecoverPayloadForBackend({ mnemonic: 'fasd', password: 'password', token: 'token' }),
      ).rejects.toThrow('Invalid mnemonic in backup key');
    });

    it('should handle errors in payload preparation', async () => {
      vi.mocked(passToHash).mockImplementation(() => {
        throw new Error('Test error');
      });
      vi.mocked(validateMnemonic).mockReturnValueOnce(true);

      await expect(
        prepareOldBackupRecoverPayloadForBackend({
          mnemonic:
            'whip pipe sphere rail witness sting hawk project east return unhappy focus shop dry midnight frog critic lion horror slide luxury consider vibrant timber',
          password: 'password',
          token: 'token',
        }),
      ).rejects.toThrow('Error preparing recovery payload');
    });
  });
});
