import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LocalStorageProtectedItem } from 'app/core/types';
import encryptedStorageService from './encrypted-storage.service';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  encryptedStorageService.clear();
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

    test('When sets protected value to empty, then nothing is stored', async () => {
      const key = LocalStorageProtectedItem.EncryptedToken;
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      await encryptedStorageService.setToken('');
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(setFromLocalStorageSpy).not.toHaveBeenCalled();
      expect(localStorageItem).toEqual(null);
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

    test('When getStorageToken(true) is called after setFolderToken, then it returns the decrypted value', async () => {
      await encryptedStorageService.setFolderToken(folderToken);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      const result = await encryptedStorageService.getStorageToken(true);

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(result).toBe(folderToken);
    });

    test('When getStorageToken(false) is called after setFileToken, then it returns the decrypted value', async () => {
      await encryptedStorageService.setFileToken(fileToken);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      const result = await encryptedStorageService.getStorageToken(false);

      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(result).toBe(fileToken);
    });

    test('When getStorageToken(true) is called with no cache but a value in storage, then it decrypts', async () => {
      const key = LocalStorageProtectedItem.EncryptedFolderToken;

      await encryptedStorageService.setFolderToken(folderToken);
      const encryptedValue = localStorage.getItem(key) as string;

      encryptedStorageService.clearFolderToken();
      localStorage.setItem(key, encryptedValue);

      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');
      const result = await encryptedStorageService.getStorageToken(true);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(result).toBe(folderToken);
    });

    test('When getStorageToken(false) is called with no cache but a value in storage, then it decrypts', async () => {
      const key = LocalStorageProtectedItem.EncryptedFileToken;

      await encryptedStorageService.setFileToken(fileToken);
      const encryptedValue = localStorage.getItem(key) as string;

      encryptedStorageService.clearFileToken();
      localStorage.setItem(key, encryptedValue);

      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');
      const result = await encryptedStorageService.getStorageToken(false);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(result).toBe(fileToken);
    });

    test('When getStorageToken(true) is called and no folder token is stored, then it returns undefined', async () => {
      const result = await encryptedStorageService.getStorageToken(true);

      expect(result).toBeUndefined();
    });

    test('When getStorageToken(false) is called and no file token is stored, then it returns undefined', async () => {
      const result = await encryptedStorageService.getStorageToken(false);

      expect(result).toBeUndefined();
    });

    test('When clearFolderToken is called, then the folder token is removed from storage', async () => {
      await encryptedStorageService.setFolderToken(folderToken);
      const key = LocalStorageProtectedItem.EncryptedFolderToken;
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      encryptedStorageService.clearFolderToken();

      expect(removeItemSpy).toHaveBeenCalledWith(key);
      expect(localStorage.getItem(key)).toBeNull();
      expect(await encryptedStorageService.getStorageToken(true)).toBeUndefined();
    });

    test('When clearFileToken is called, then the file token is removed from storage', async () => {
      await encryptedStorageService.setFileToken(fileToken);
      const key = LocalStorageProtectedItem.EncryptedFileToken;
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      encryptedStorageService.clearFileToken();

      expect(removeItemSpy).toHaveBeenCalledWith(key);
      expect(localStorage.getItem(key)).toBeNull();
      expect(await encryptedStorageService.getStorageToken(false)).toBeUndefined();
    });
  });
});
