import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LocalStorageProtectedItem } from 'app/core/types';
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

  describe('Fetching user data from local storage', () => {
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

    const stringifyMockedUser = JSON.stringify(mockUserSettings);
    test('When the user data exists in local storage, then the user is returned', () => {
      encryptedStorageService.setUser(mockUserSettings);
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const userFromLocalStorage = encryptedStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageProtectedItem.User);
      expect(userFromLocalStorage).toStrictEqual(JSON.parse(stringifyMockedUser));
    });

    test('When the user data does not exist in local storage, then nothing (null) is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      localStorage.removeItem(LocalStorageProtectedItem.User);
      const userFromLocalStorage = encryptedStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageProtectedItem.User);
      expect(userFromLocalStorage).toBeNull();
    });
  });
});
