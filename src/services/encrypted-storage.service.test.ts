import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LocalStorageProtectedItem, LocalStorageItem } from 'app/core/types';
import encryptedStorageService from './encrypted-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Testing the encrypted storage service', () => {
  describe('Get and set encrypted values', () => {
    const value = 'test-value';

    test('When sets protected value, then the value is stored encrypted', async () => {
      const key = LocalStorageProtectedItem.EncryptedToken;
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      await encryptedStorageService.setToken(value);
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(key, expect.any(String));
      expect(localStorageItem).not.toEqual(value);
    });

    test('When hydrates encrypted storage, then the result is decrypted', async () => {
      await encryptedStorageService.setToken(value);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      await encryptedStorageService.hydrateEncryptedStorageCache();

      expect(cryptoSpy).toHaveBeenCalled();
    });

    test('When hydrateEncryptedStorageCache fails, then getToken still returns undefined', async () => {
      encryptedStorageService.clear();
      const key = LocalStorageProtectedItem.EncryptedToken;
      localStorage.setItem(key, 'not-valid-encrypted-token');

      await expect(encryptedStorageService.hydrateEncryptedStorageCache()).resolves.toBeUndefined();

      expect(encryptedStorageService.getToken()).toBeUndefined();
    });
  });

  describe('Clear token', () => {
    const value = 'test-value';

    test('When clear is called, then the in-memory cache is nulled and token is removed from encrypted storage', async () => {
      await encryptedStorageService.setToken(value);
      const key = LocalStorageProtectedItem.EncryptedToken;
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      encryptedStorageService.clear();

      expect(encryptedStorageService.getToken()).toBeUndefined();
      expect(removeItemSpy).toHaveBeenCalledWith(key);
      expect(localStorage.getItem(key)).toBeNull();
    });
  });
  describe('Get and set user', () => {
    const mockUserSettings: UserSettings = {
      userId: 'user_123',
      uuid: 'uuid-1234-5678',
      email: 'test.user@example.com',
      name: 'Test',
      lastname: 'User',
      username: 'testuser',
      bridgeUser: 'bridge_user',
      bucket: 'user-bucket',
      backupsBucket: 'backups-bucket',
      root_folder_id: 1,
      rootFolderId: 'folder-id-123',
      rootFolderUuid: 'folder-uuid-456',
      sharedWorkspace: false,
      credit: 100,
      mnemonic: 'test mnemonic phrase',
      keys: {
        ecc: {
          publicKey: 'ecc-public-key-mock',
          privateKey: 'ecc-private-key-mock',
        },
        kyber: {
          publicKey: 'kyber-public-key-mock',
          privateKey: 'kyber-private-key-mock',
        },
      },
      teams: true,
      appSumoDetails: null,
      registerCompleted: true,
      hasReferralsProgram: true,
      createdAt: new Date('2023-06-01T12:00:00.000Z'),
      avatar: null,
      emailVerified: true,
    };

    test('When the user data exists in encryptede storage, then the user is returned', async () => {
      const key = LocalStorageProtectedItem.EncryptedUser;

      await encryptedStorageService.setUser(mockUserSettings);
      const data = localStorage.getItem(key);
      console.log('TEST HERE', data);
      encryptedStorageService.clear();
      localStorage.setItem(key, data as string);

      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');
      const userFromLocalStorage = await encryptedStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(key);
      expect(data).not.toBe(JSON.stringify(mockUserSettings));
      expect(userFromLocalStorage).toStrictEqual(mockUserSettings);
    });

    test('When the user data does not exist in encrypted storage, then nothing (null) is returned', async () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      encryptedStorageService.clear();
      const userFromLocalStorage = await encryptedStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageProtectedItem.EncryptedUser);
      expect(userFromLocalStorage).toBeNull();
    });

    test('When encrypted user is missing but unencrypted legacy user exists, then it migrates and returns it', async () => {
      encryptedStorageService.clear();
      localStorage.setItem(LocalStorageItem.User, JSON.stringify(mockUserSettings));

      const userFromLocalStorage = await encryptedStorageService.getUser();

      expect(userFromLocalStorage).toStrictEqual(mockUserSettings);
      expect(localStorage.getItem(LocalStorageItem.User)).toBeNull();
      expect(localStorage.getItem(LocalStorageProtectedItem.EncryptedUser)).not.toBeNull();
    });

    test('When legacy unencrypted user is invalid JSON, then getUser returns null', async () => {
      encryptedStorageService.clear();
      localStorage.setItem(LocalStorageItem.User, 'not-valid-json');

      const userFromLocalStorage = await encryptedStorageService.getUser();

      expect(userFromLocalStorage).toBeNull();
    });
  });
});
