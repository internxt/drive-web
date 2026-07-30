import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LocalStorageProtectedItem, LocalStorageItem } from 'app/core/types';
import encryptedStorageService from './encrypted-storage.service';
import { WorkspaceCredentialsDetails } from '@internxt/sdk/dist/workspaces';

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
});
