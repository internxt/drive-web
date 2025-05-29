import { describe, expect, it, vi } from 'vitest';
import localStorageService, { STORAGE_KEYS } from './local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Workspace } from '../types';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';

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

const mockWorkspaceData: WorkspaceData = {
  workspaceUser: {
    backupsUsage: '500000000', // 500 MB
    createdAt: '2023-05-01T10:00:00.000Z',
    deactivated: false,
    driveUsage: '1200000000', // 1.2 GB
    freeSpace: '8800000000', // 8.8 GB free
    id: 'workspace-user-001',
    isManager: true,
    isOwner: false,
    key: 'mock-encryption-key',
    member: {
      avatar: null,
      backupsBucket: 'backups-bucket-id',
      bridgeUser: 'bridge-user-mock',
      credit: 100,
      email: 'jane.doe@example.com',
      errorLoginCount: 0,
      id: 101,
      isEmailActivitySended: true,
      lastPasswordChangedAt: '2023-07-01T12:00:00.000Z',
      lastResend: '2023-08-01T12:00:00.000Z',
      lastname: 'Doe',
      name: 'Jane',
      referralCode: 'REF-JANE-123',
      referrer: null,
      registerCompleted: true,
      rootFolderId: 2001,
      sharedWorkspace: true,
      syncDate: '2023-10-01T08:00:00.000Z',
      userId: 'user-1234',
      username: 'janedoe',
      uuid: 'uuid-janedoe-5678',
      welcomePack: true,
    },
    memberId: '101',
    rootFolderId: 'folder-abc-123',
    spaceLimit: '10000000000', // 10 GB
    updatedAt: '2023-10-01T12:00:00.000Z',
    usedSpace: '1700000000', // 1.7 GB
    workspaceId: 'workspace-xyz-456',
  },
  workspace: {
    id: 'workspace-xyz-456',
    ownerId: 'user-1234',
    address: '123 Main St, Example City',
    name: 'Marketing Workspace',
    description: 'Workspace for the marketing department',
    defaultTeamId: 'team-789',
    workspaceUserId: 'workspace-user-001',
    setupCompleted: true,
    createdAt: '2023-04-01T09:30:00.000Z',
    updatedAt: '2023-10-01T12:30:00.000Z',
    avatar: null,
    rootFolderId: 'folder-abc-123',
    phoneNumber: null,
  },
};

describe('Testing the local storage service', () => {
  describe('Get a value from local storage', () => {
    it('When the requested key exists, then the value is returned', () => {
      const localStorageKey = 'ITEM_EXISTS';
      const localStorageValue = 'item-exists';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(localStorageValue);

      const localStorageItem = localStorageService.get(localStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(localStorageKey);
      expect(localStorageItem).toStrictEqual(localStorageValue);
    });

    it('When the requested key does not exist, then nothing (null) is returned', () => {
      const localStorageKey = 'ITEM_DOES_NOT_EXIST';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const localStorageItem = localStorageService.get(localStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(localStorageKey);
      expect(localStorageItem).toBeNull();
    });
  });

  describe('Set a value with the given key', () => {
    it('When the key and its value is given, then they are set correctly', () => {
      const localStorageKey = 'SET_KEY';
      const localStorageValue = 'new-value';
      const setToLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem').mockReturnValue();

      localStorageService.set(localStorageKey, localStorageValue);

      expect(setToLocalStorageSpy).toHaveBeenCalled();
      expect(setToLocalStorageSpy).toHaveBeenCalledWith(localStorageKey, localStorageValue);
    });
  });

  describe('Remove item from local storage', () => {
    it('When an item is requested to be deleted from local storage, then it is removed correctly', () => {
      const localStorageKey = 'ITEM_TO_REMOVE';
      const removeFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'removeItem').mockReturnValue();

      localStorageService.removeItem(localStorageKey);

      expect(removeFromLocalStorageSpy).toHaveBeenCalled();
      expect(removeFromLocalStorageSpy).toHaveBeenCalledWith(localStorageKey);
    });
  });

  describe('Check if an item exists in local storage', () => {
    it('When the item exists, then true is returned', () => {
      const existingLocalStorageKey = 'ITEM_EXISTS';
      const existingLocalStorageValue = 'value-exists';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(existingLocalStorageValue);

      const itemExists = localStorageService.exists(existingLocalStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(existingLocalStorageKey);
      expect(itemExists).toBeTruthy();
    });

    it('When the item does not exist, then false is returned', () => {
      const existingLocalStorageKey = 'ITEM_DOES_NOT_EXIST';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const itemExists = localStorageService.exists(existingLocalStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(existingLocalStorageKey);
      expect(itemExists).toBeFalsy();
    });
  });

  describe('Check if user completed the tutorial', () => {
    it('When the user completed the tutorial, a value indicating so is returned (true)', () => {
      const tutorialCompletedId = 'id_1234';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(tutorialCompletedId);

      const tutorialCompleted = localStorageService.hasCompletedTutorial(tutorialCompletedId);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.TUTORIAL_COMPLETED_ID);
      expect(tutorialCompleted).toBeTruthy();
    });

    it('When the user did not completed the tutorial, a value indicating so is returned (false)', () => {
      const tutorialCompletedId = 'id_1234';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const tutorialCompleted = localStorageService.hasCompletedTutorial(tutorialCompletedId);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.TUTORIAL_COMPLETED_ID);
      expect(tutorialCompleted).toBeFalsy();
    });
  });

  describe('Fetching user data from local storage', () => {
    it('When the user data exists in local storage, then the user is returned', () => {
      const stringifyMockedUser = JSON.stringify(mockUserSettings);
      const userLocalStorageKey = 'xUser';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(stringifyMockedUser);

      const userFromLocalStorage = localStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(userLocalStorageKey);
      expect(userFromLocalStorage).toStrictEqual(JSON.parse(stringifyMockedUser));
    });

    it('When the user data does not exist in local storage, then nothing (null) is returned', () => {
      const userLocalStorageKey = 'xUser';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const userFromLocalStorage = localStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(userLocalStorageKey);
      expect(userFromLocalStorage).toBeNull();
    });
  });

  describe('Workspaces', () => {
    const workspaceKey = 'workspace';

    it('When the workspace item exists, then it is returned', () => {
      const workspaceValueInLocalStorage = Workspace.Business;
      const getFromLocalStorageSpy = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockReturnValue(workspaceValueInLocalStorage);

      const workspace = localStorageService.getWorkspace();

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(workspaceKey);
      expect(workspace).toStrictEqual(workspaceValueInLocalStorage);
    });

    it('When the workspace item does not exist, then it is returned', () => {
      const workspaceValueInLocalStorage = Workspace.Individuals;
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const workspace = localStorageService.getWorkspace();

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(workspaceKey);
      expect(workspace).toStrictEqual(workspaceValueInLocalStorage);
    });

    describe('Get workspace credentials', () => {
      it('When there are credentials from a workspace, then the credentials are returned', () => {
        const stringifyMockCredentials = JSON.stringify(mockWorkspaceCredentialsDetails);
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(stringifyMockCredentials);

        const workspaceCredentials = localStorageService.getWorkspaceCredentials();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
        expect(workspaceCredentials).toStrictEqual(JSON.parse(stringifyMockCredentials));
      });

      it('When there are not credentials from a workspace, then a value indicating so is returned (null)', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

        const workspaceCredentials = localStorageService.getWorkspaceCredentials();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
        expect(workspaceCredentials).toBeNull();
      });
    });

    describe('Get workspace item data', () => {
      it('When a workspace object exists, then the object is returned', () => {
        const stringifyWorkspaceData = JSON.stringify(mockWorkspaceData);
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(stringifyWorkspaceData);

        const workspaceCredentials = localStorageService.getB2BWorkspace();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.B2B_WORKSPACE);
        expect(workspaceCredentials).toStrictEqual(JSON.parse(stringifyWorkspaceData));
      });

      it('When a workspace object does not exist, then a value indicating so is returned (null)', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

        const workspaceCredentials = localStorageService.getB2BWorkspace();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.B2B_WORKSPACE);
        expect(workspaceCredentials).toBeNull();
      });
    });
  });

  describe('Clearing local storage', () => {
    it('When clear storage is requested, then removes all keys', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('starwars');
      const expectedKeysToRemove = [
        'xUser',
        'xMnemonic',
        'xToken',
        'xNewToken',
        'xTokenTeam',
        'workspace',
        'language',
        'showSummerBanner',
        'xInvitedToken',
        'xResourcesToken',
        'star_wars_theme_enabled',
        STORAGE_KEYS.THEMES.MANAGEMENTID_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
        STORAGE_KEYS.THEMES.ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY,
        STORAGE_KEYS.B2B_WORKSPACE,
        STORAGE_KEYS.WORKSPACE_CREDENTIALS,
      ];

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockReturnValue();
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockReturnValue();

      localStorageService.clear();

      expect(getItemSpy).toHaveBeenCalledWith('theme');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'system');

      for (const key of expectedKeysToRemove) {
        expect(removeItemSpy).toHaveBeenCalledWith(key);
      }
    });
  });
});
