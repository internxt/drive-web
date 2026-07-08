import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageProtectedItem } from 'app/core/types';
import encryptedStorageService from './encrypted-storage.service';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Testing the local storage service', () => {
  describe('Get and set encrypted values', () => {
    const value = 'test-value';

    it('When sets protected value, then the value is stored encrypted', async () => {
      const key = LocalStorageProtectedItem.EncryptedToken;
      const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'encrypt');

      await encryptedStorageService.setToken(value);
      const localStorageItem = localStorage.getItem(key);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(setFromLocalStorageSpy).toHaveBeenCalledWith(key, expect.any(String));
      expect(localStorageItem).not.toEqual(value);
    });

    it('When hydrates encrypted storage, then the result is decrypted', async () => {
      await encryptedStorageService.setToken(value);
      const cryptoSpy = vi.spyOn(window.crypto.subtle, 'decrypt');

      await encryptedStorageService.hydrateEncryptedStorageCache();

      expect(cryptoSpy).toHaveBeenCalled();
    });
  });
});
