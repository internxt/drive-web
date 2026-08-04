import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LocalStorageProtectedItem, LocalStorageItem } from 'app/core/types';
import encryptedStorageService from './encrypted-storage.service';
import { WorkspaceCredentialsDetails } from '@internxt/sdk/dist/workspaces';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  encryptedStorageService.clear();
});

describe('Testing the encrypted storage service', () => {
  describe('Get workspace item data', () => {
    test('When workspace is set, then mnemonic and id are set', async () => {
      const mockWorkspaceMnemonic = 'test-workspace-mnemonic';
      const mockWorkspaceID = 'test-workspace-id';
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');
      const key = LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic;

      await encryptedStorageService.setB2BWorkspace(mockWorkspaceID, mockWorkspaceMnemonic);
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(setFromLocalStorageSpy).toHaveBeenCalledTimes(2);
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.B2BworkspaceId, mockWorkspaceID);
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(key, expect.any(String));

      expect(await encryptedStorageService.getB2BWorkspaceMnemonic()).toBe(mockWorkspaceMnemonic);
      expect(localStorageItem).not.toEqual(mockWorkspaceMnemonic);
    });

    test('When a workspace is cleaned, then mnemonic and id are removed', () => {
      const removeFromStorageSpy = vi.spyOn(Storage.prototype, 'removeItem');

      encryptedStorageService.clearB2BWorkspace();

      expect(removeFromStorageSpy).toHaveBeenCalledTimes(2);

      expect(localStorage.getItem(LocalStorageItem.B2BworkspaceId)).toBeNull();
      expect(localStorage.getItem(LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic)).toBeNull();
    });
  });
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

    test('When sets protected value to empty, then nothing is stored', async () => {
      const key = LocalStorageProtectedItem.EncryptedToken;
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      await encryptedStorageService.setToken('');
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(setFromLocalStorageSpy).not.toHaveBeenCalled();
      expect(localStorageItem).toBeNull();
    });

    test('When hydrates encrypted storage, then the result is decrypted', async () => {
      const mockCredentials = { tokenHeader: 'workspace-token-123' } as WorkspaceCredentialsDetails;
      await encryptedStorageService.setWorkspaceCredentials(mockCredentials);
      await encryptedStorageService.setToken(value);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      await encryptedStorageService.hydrateEncryptedStorageCache();

      expect(cryptoSpy).toHaveBeenCalledTimes(2);
    });

    test('When hydrateEncryptedStorageCache fails, then getToken and getWorkspaceCredentials still returns undefined', async () => {
      const key = LocalStorageProtectedItem.EncryptedToken;
      localStorage.setItem(key, 'not-valid-encrypted-token');

      await expect(encryptedStorageService.hydrateEncryptedStorageCache()).resolves.toBeUndefined();

      expect(encryptedStorageService.getToken()).toBeUndefined();
      expect(encryptedStorageService.getWorkspaceCredentials()).toBeNull();
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

  describe('Workspace credentials', () => {
    const mockCredentials = { tokenHeader: 'workspace-token-123' } as WorkspaceCredentialsDetails;

    test('When setWorkspaceCredentials is called, then the value is stored encrypted', async () => {
      const key = LocalStorageProtectedItem.EncryptedWorkspaceCredentials;
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      await encryptedStorageService.setWorkspaceCredentials(mockCredentials);
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(key, expect.any(String));
      expect(localStorageItem).not.toEqual(JSON.stringify(mockCredentials));
    });

    test('When getWorkspaceCredentials is called after setWorkspaceCredentials, then it returns the cached value', async () => {
      await encryptedStorageService.setWorkspaceCredentials(mockCredentials);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      const result = encryptedStorageService.getWorkspaceCredentials();

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(result).toEqual(mockCredentials);
    });

    test('When getWorkspaceCredentials is called and no credentials are stored, then it returns null', () => {
      const result = encryptedStorageService.getWorkspaceCredentials();

      expect(result).toBeNull();
    });

    test('When clearWorkspaceCredentials is called, then credentials are removed from storage and cache', async () => {
      await encryptedStorageService.setWorkspaceCredentials(mockCredentials);
      const key = LocalStorageProtectedItem.EncryptedWorkspaceCredentials;
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      encryptedStorageService.clearWorkspaceCredentials();

      expect(removeItemSpy).toHaveBeenCalledWith(key);
      expect(localStorage.getItem(key)).toBeNull();
      expect(encryptedStorageService.getWorkspaceCredentials()).toBeNull();
    });
  });

  describe('getB2BWorkspaceMnemonic', () => {
    test('When no mnemonic is stored, then it returns null', async () => {
      const result = await encryptedStorageService.getB2BWorkspaceMnemonic();

      expect(result).toBeNull();
    });

    test('When called with no cache but a value in storage, then it decrypts and returns it', async () => {
      const mockWorkspaceMnemonic = 'test-workspace-mnemonic';
      const key = LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic;

      await encryptedStorageService.setB2BWorkspace('test-workspace-id', mockWorkspaceMnemonic);
      const encryptedValue = localStorage.getItem(key) as string;

      encryptedStorageService.clearB2BWorkspace();
      localStorage.setItem(key, encryptedValue);

      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');
      const result = await encryptedStorageService.getB2BWorkspaceMnemonic();

      expect(cryptoSpy).toHaveBeenCalled();
      expect(result).toBe(mockWorkspaceMnemonic);
    });

    test('When the workspace mnemonic is already cached, then returns it without decrypting', async () => {
      const mockWorkspaceMnemonic = 'test-workspace-mnemonic';
      await encryptedStorageService.setB2BWorkspace('test-workspace-id', mockWorkspaceMnemonic);

      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');
      const result = await encryptedStorageService.getB2BWorkspaceMnemonic();

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(result).toBe(mockWorkspaceMnemonic);
    });

    test('When storage contains a corrupted value, then it fails silently and returns null', async () => {
      const key = LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic;
      localStorage.setItem(key, 'not-valid-encrypted-value');

      const result = await encryptedStorageService.getB2BWorkspaceMnemonic();

      expect(result).toBeNull();
    });
  });

  describe('Fetching user data from encrypted storage', () => {
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

    test('When the user data exists in cache, then the user is returned', async () => {
      await encryptedStorageService.setUser(mockUserSettings);

      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const userFromLocalStorage = encryptedStorageService.getUser();

      expect(getFromLocalStorageSpy).not.toHaveBeenCalled();
      expect(userFromLocalStorage).toStrictEqual(mockUserSettings);
    });

    test('When the user data exists in encrypted storage, then the user is returned', async () => {
      const key = LocalStorageProtectedItem.User;
      await encryptedStorageService.setUser(mockUserSettings);
      const data = localStorage.getItem(key);
      encryptedStorageService.clear();
      localStorage.setItem(key, data as string);

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

  describe('Folder and file storage tokens', () => {
    const folderToken = 'folder-token-test';
    const fileToken = 'file-token-test';

    test('When setFolderToken is called, then the value is stored encrypted', async () => {
      const key = LocalStorageProtectedItem.EncryptedFolderToken;
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      await encryptedStorageService.setFolderToken(folderToken);
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(key, expect.any(String));
      expect(localStorageItem).not.toEqual(folderToken);
    });

    test('When setFileToken is called, then the value is stored encrypted', async () => {
      const key = LocalStorageProtectedItem.EncryptedFileToken;
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      await encryptedStorageService.setFileToken(fileToken);
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(key, expect.any(String));
      expect(localStorageItem).not.toEqual(fileToken);
    });

    test('When getSharedItemAccessToken(true) is called after setFolderToken, then it returns the decrypted value', async () => {
      await encryptedStorageService.setFolderToken(folderToken);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      const result = await encryptedStorageService.getSharedItemAccessToken(true);

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(result).toBe(folderToken);
    });

    test('When getSharedItemAccessToken(false) is called after setFileToken, then it returns the decrypted value', async () => {
      await encryptedStorageService.setFileToken(fileToken);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      const result = await encryptedStorageService.getSharedItemAccessToken(false);

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(result).toBe(fileToken);
    });

    test('When getSharedItemAccessToken(true) is called with no cache but a value in storage, then it decrypts', async () => {
      const key = LocalStorageProtectedItem.EncryptedFolderToken;

      await encryptedStorageService.setFolderToken(folderToken);
      const encryptedValue = localStorage.getItem(key) as string;

      encryptedStorageService.clearFolderToken();
      localStorage.setItem(key, encryptedValue);

      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');
      const result = await encryptedStorageService.getSharedItemAccessToken(true);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(result).toBe(folderToken);
    });

    test('When getSharedItemAccessToken(false) is called with no cache but a value in storage, then it decrypts', async () => {
      const key = LocalStorageProtectedItem.EncryptedFileToken;

      await encryptedStorageService.setFileToken(fileToken);
      const encryptedValue = localStorage.getItem(key) as string;

      encryptedStorageService.clearFileToken();
      localStorage.setItem(key, encryptedValue);

      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');
      const result = await encryptedStorageService.getSharedItemAccessToken(false);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(result).toBe(fileToken);
    });

    test('When getSharedItemAccessToken(true) is called and no folder token is stored, then it returns undefined', async () => {
      const result = await encryptedStorageService.getSharedItemAccessToken(true);

      expect(result).toBeUndefined();
    });

    test('When getSharedItemAccessToken(false) is called and no file token is stored, then it returns undefined', async () => {
      const result = await encryptedStorageService.getSharedItemAccessToken(false);

      expect(result).toBeUndefined();
    });

    test('When clearFolderToken is called, then the folder token is removed from storage', async () => {
      await encryptedStorageService.setFolderToken(folderToken);
      const key = LocalStorageProtectedItem.EncryptedFolderToken;
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      encryptedStorageService.clearFolderToken();

      expect(removeItemSpy).toHaveBeenCalledWith(key);
      expect(localStorage.getItem(key)).toBeNull();
      expect(await encryptedStorageService.getSharedItemAccessToken(true)).toBeUndefined();
    });

    test('When clearFileToken is called, then the file token is removed from storage', async () => {
      await encryptedStorageService.setFileToken(fileToken);
      const key = LocalStorageProtectedItem.EncryptedFileToken;
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      encryptedStorageService.clearFileToken();

      expect(removeItemSpy).toHaveBeenCalledWith(key);
      expect(localStorage.getItem(key)).toBeNull();
      expect(await encryptedStorageService.getSharedItemAccessToken(false)).toBeUndefined();
    });
  });
});
