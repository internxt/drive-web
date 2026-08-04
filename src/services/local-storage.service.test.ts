import { afterAll, beforeEach, describe, expect, it, test, vi } from 'vitest';
import localStorageService from './local-storage.service';
import { LocalStorageItem } from 'app/core/types';
import { WorkspaceCredentialsDetails } from '@internxt/sdk/dist/workspaces';
import encryptedStorageService from './encrypted-storage.service';

const userUUID = 'user_123';

const mockWorkspaceCredentialsDetails: WorkspaceCredentialsDetails = {
  workspaceId: 'workspace-123',
  bucket: 'workspace-bucket',
  workspaceUserId: 'workspace-user-456',
  email: 'workspace.user@example.com',
  credentials: {
    networkPass: 'mockNetworkPassword123',
    networkUser: 'workspace.network.user',
  },
  tokenHeader: 'Bearer mock-token-abc-123',
};

const mockWorkspaceId = 'workspace-user-001';

const localStorageKey = LocalStorageItem.Language;
const localStorageValue = 'item-exists';

beforeEach(async () => {
  localStorage.setItem(localStorageKey, localStorageValue);
  localStorage.setItem(LocalStorageItem.UserUUID, userUUID);
  await encryptedStorageService.setWorkspaceCredentials(mockWorkspaceCredentialsDetails);
  localStorage.setItem(LocalStorageItem.B2BworkspaceId, mockWorkspaceId);
  localStorage.setItem(LocalStorageItem.Theme, 'starwars');
  vi.clearAllMocks();
  vi.resetModules();
});

afterAll(() => {
  localStorage.clear();
});

describe('Testing the local storage service', () => {
  describe('Get a value from local storage', () => {
    it('When the requested key exists, then the value is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const localStorageItem = localStorageService.get(localStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(localStorageKey);
      expect(localStorageItem).toStrictEqual(localStorageValue);
    });

    it('When the requested key does not exist, then nothing (null) is returned', () => {
      const localStorageKey = LocalStorageItem.IsThemeDark;
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const localStorageItem = localStorageService.get(localStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(localStorageKey);
      expect(localStorageItem).toBeNull();
    });
  });

  describe('Set a value with the given key', () => {
    it('When the key and its value is given, then they are set correctly', () => {
      const localStorageKey = LocalStorageItem.AmountPaid;
      const localStorageValue = 'new-value';
      const setToLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

      localStorageService.set(localStorageKey, localStorageValue);

      expect(setToLocalStorageSpy).toHaveBeenCalled();
      expect(setToLocalStorageSpy).toHaveBeenCalledWith(localStorageKey, localStorageValue);
    });
  });

  describe('Remove item from local storage', () => {
    const removeLocalStorageKey = LocalStorageItem.Currency;
    beforeEach(() => {
      localStorage.setItem(removeLocalStorageKey, 'item-to-remove');
    });

    it('When an item is requested to be deleted from local storage, then it is removed correctly', () => {
      const removeFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'removeItem');

      localStorageService.removeItem(removeLocalStorageKey);
      const nonExistentItem = localStorageService.get(removeLocalStorageKey);

      expect(removeFromLocalStorageSpy).toHaveBeenCalled();
      expect(removeFromLocalStorageSpy).toHaveBeenCalledWith(removeLocalStorageKey);
      expect(nonExistentItem).toBeNull();
    });
  });

  describe('Workspaces', () => {
    describe('Get workspace credentials', () => {
      it('When there are credentials from a workspace, then the credentials are returned', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

        const workspaceCredentials = encryptedStorageService.getWorkspaceCredentials();

        expect(getFromLocalStorageSpy).not.toHaveBeenCalled();
        expect(workspaceCredentials).toStrictEqual(mockWorkspaceCredentialsDetails);
      });
    });
  });

  describe('Backup key acknowledgment', () => {
    const seenAtKey = `backup_key_seen_at_${userUUID}`;
    const acknowledgedKey = `backup_key_acknowledged_at_${userUUID}`;

    describe('Get backup keys', () => {
      test('When the user has never interacted with the backup keys dialog, then nothing is returned', () => {
        const { saved, seenAt } = localStorageService.getBackupKeys();

        expect(saved).toBe(false);
        expect(seenAt).toBeNull();
      });

      test('When the user has acknowledged the backup key, then saved is true', () => {
        localStorage.setItem(acknowledgedKey, 'true');

        const { saved } = localStorageService.getBackupKeys();

        expect(saved).toBe(true);
      });

      test('When the user has already been shown the dialog before, then the date is returned', () => {
        const date = new Date().toISOString();
        localStorage.setItem(seenAtKey, date);

        const { seenAt } = localStorageService.getBackupKeys();

        expect(seenAt).toBe(date);
      });
    });

    describe('Set backup key saved', () => {
      test('When the user saves the backup key, then the acknowledged flag is persisted for that user', () => {
        localStorageService.setBackupKeysAcknowledged();

        expect(localStorage.getItem(acknowledgedKey)).toBe('true');
      });
    });

    describe('Track when the dialog was last shown', () => {
      test('When the dialog is shown, then the date is persisted for that user', () => {
        const date = new Date().toISOString();

        localStorageService.setBackupKeysSeenAt(date);

        expect(localStorage.getItem(seenAtKey)).toBe(date);
      });
    });

    describe('Remove when the dialog was last shown', () => {
      test('When the backup key is acknowledged, then the last seen date is removed for that user', () => {
        localStorage.setItem(seenAtKey, new Date().toISOString());

        localStorageService.removeBackupKeysSeenAt();

        expect(localStorage.getItem(seenAtKey)).toBeNull();
      });
    });
  });

  describe('Clearing local storage', () => {
    it('When clear storage is requested, then removes all keys', () => {
      const clearSpy = vi.spyOn(Storage.prototype, 'clear');
      localStorageService.setBackupKeysAcknowledged();
      localStorageService.setBackupKeysSeenAt(new Date().toISOString());

      localStorageService.clear();

      expect(clearSpy).toHaveBeenCalledTimes(1);

      const seenAtKey = `backup_key_seen_at_${userUUID}`;
      const acknowledgedKey = `backup_key_acknowledged_at_${userUUID}`;
      expect(localStorage.getItem(seenAtKey)).toBeNull();
      expect(localStorage.getItem(acknowledgedKey)).toBeNull();
    });
  });
});
