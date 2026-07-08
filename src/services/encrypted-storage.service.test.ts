import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageProtectedItem } from 'app/core/types';
import encryptedStorageService from './encrypted-storage.service';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  localStorage.clear();
});

afterAll(() => {
  localStorage.clear();
});

describe('Testing the local storage service', () => {
  describe('Get and set encrypted values', () => {
    it('When sets protected value, then the value is stored encrypted', async () => {
      await encryptedStorageService.hydrateEncryptedStorageCache();
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      const key = LocalStorageProtectedItem.EncryptedToken;
      const value = 'test-value';
      await encryptedStorageService.setToken(value);

      const localStorageItem = localStorage.getItem(key);

      expect(setFromLocalStorageSpy).toHaveBeenCalled();
      expect(cryptoSpy).toHaveBeenCalled();
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(key, expect.any(String));
      expect(localStorageItem).not.toEqual(value);
    });

    it('When gets a protected value, then the result is decrypted', async () => {
      await encryptedStorageService.hydrateEncryptedStorageCache();
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      const value = 'test-value';
      await encryptedStorageService.setToken(value);

      const localStorageItem = await encryptedStorageService.getToken();

      expect(cryptoSpy).toHaveBeenCalled();
      expect(localStorageItem).toBe(value);
    });
  });
});
