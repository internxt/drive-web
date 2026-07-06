import { afterAll, beforeEach, describe, expect, it, test, vi } from 'vitest';
import localStorageService from './local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { LocalStorageItem } from 'app/core/types';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';

export const mockUserSettings: UserSettings = {
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
  privateKey: 'private-key-mock',
  publicKey: 'public-key-mock',
  revocationKey: 'revocation-key-mock',
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

const stringifyMockedUser = JSON.stringify(mockUserSettings);
const stringifyMockCredentials = JSON.stringify(mockWorkspaceCredentialsDetails);

beforeEach(() => {
  localStorage.setItem(localStorageKey, localStorageValue);
  localStorage.setItem(LocalStorageItem.User, stringifyMockedUser);
  localStorage.setItem(LocalStorageItem.WorkspaceCredentials, stringifyMockCredentials);
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

  describe('Fetching user data from local storage', () => {
    it('When the user data exists in local storage, then the user is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const userFromLocalStorage = localStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.User);
      expect(userFromLocalStorage).toStrictEqual(JSON.parse(stringifyMockedUser));
    });

    it('When the user data does not exist in local storage, then nothing (null) is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      localStorage.removeItem(LocalStorageItem.User);
      const userFromLocalStorage = localStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.User);
      expect(userFromLocalStorage).toBeNull();
    });
  });

  describe('Workspaces', () => {
    describe('Get workspace credentials', () => {
      it('When there are credentials from a workspace, then the credentials are returned', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

        const workspaceCredentials = localStorageService.getWorkspaceCredentials();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.WorkspaceCredentials);
        expect(workspaceCredentials).toStrictEqual(JSON.parse(stringifyMockCredentials));
      });

      it('When there are not credentials from a workspace, then a value indicating so is returned (null)', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

        localStorage.removeItem(LocalStorageItem.WorkspaceCredentials);
        const workspaceCredentials = localStorageService.getWorkspaceCredentials();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.WorkspaceCredentials);
        expect(workspaceCredentials).toBeNull();
      });
    });

    describe('Get workspace item data', () => {
      it('When workspace is set, then mnemonic and id are set', () => {
        const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

        localStorageService.setB2BWorkspace('test-workspace-id', 'test-workspace-mnemonic');

        expect(setFromLocalStorageSpy).toHaveBeenCalled();
        expect(setFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.B2BworkspaceId, 'test-workspace-id');
        expect(setFromLocalStorageSpy).toHaveBeenCalledWith(
          LocalStorageItem.B2BworkspaceMnemonic,
          'test-workspace-mnemonic',
        );
      });

      it('When a workspace is cleaned, then mnemonic and id are removed', () => {
        const setFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

        localStorageService.clearB2BWorkspace();

        expect(setFromLocalStorageSpy).toHaveBeenCalled();
        expect(setFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.B2BworkspaceId, '');
        expect(setFromLocalStorageSpy).toHaveBeenCalledWith(LocalStorageItem.B2BworkspaceMnemonic, '');

        expect(localStorageService.get(LocalStorageItem.B2BworkspaceId)).toBe('');
        expect(localStorageService.get(LocalStorageItem.B2BworkspaceMnemonic)).toBe('');
      });
    });
  });

  describe('Backup key acknowledgment', () => {
    const userId = mockUserSettings.uuid;
    const seenAtKey = `backup_key_seen_at_${userId}`;
    const acknowledgedKey = `backup_key_acknowledged_at_${userId}`;

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

    describe('clear', () => {
      test('When the user logs out, then the last seen date is removed but the acknowledged flag is kept', () => {
        const date = new Date().toISOString();
        localStorage.setItem(seenAtKey, date);
        localStorage.setItem(acknowledgedKey, 'true');

        localStorageService.clear();

        expect(localStorage.getItem(seenAtKey)).toBeNull();
        expect(localStorage.getItem(acknowledgedKey)).toBe('true');
      });
    });
  });

  describe('Clearing local storage', () => {
    it('When clear storage is requested, then removes all keys', () => {
      const expectedKeysToRemove = Object.values(LocalStorageItem);

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      localStorageService.clear();

      expect(setItemSpy).toHaveBeenCalledWith(LocalStorageItem.Theme, 'system');

      for (const key of expectedKeysToRemove) {
        expect(removeItemSpy).toHaveBeenCalledWith(key);
      }
    });
  });
});
