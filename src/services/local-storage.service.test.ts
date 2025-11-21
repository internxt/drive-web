import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import localStorageService from './local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Workspace } from 'app/core/types';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { STORAGE_KEYS } from './storage-keys';

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

const localStorageKey = 'ITEM_EXISTS';
const localStorageValue = 'item-exists';
const tutorialCompletedId = 'id_1234';
const userLocalStorageKey = 'xUser';
const workspaceKey = 'workspace';

const stringifyMockedUser = JSON.stringify(mockUserSettings);
const stringifyMockCredentials = JSON.stringify(mockWorkspaceCredentialsDetails);
const stringifyWorkspaceData = JSON.stringify(mockWorkspaceData);
const workspaceValueInLocalStorage = Workspace.Business;

beforeEach(() => {
  localStorage.setItem(localStorageKey, localStorageValue);
  localStorage.setItem(userLocalStorageKey, stringifyMockedUser);
  localStorage.setItem(workspaceKey, workspaceValueInLocalStorage);
  localStorage.setItem(STORAGE_KEYS.TUTORIAL_COMPLETED_ID, tutorialCompletedId);
  localStorage.setItem(STORAGE_KEYS.WORKSPACE_CREDENTIALS, stringifyMockCredentials);
  localStorage.setItem(STORAGE_KEYS.B2B_WORKSPACE, stringifyWorkspaceData);
  localStorage.setItem('theme', 'starwars');
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
      const localStorageKey = 'ITEM_DOES_NOT_EXIST';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

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
      const setToLocalStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

      localStorageService.set(localStorageKey, localStorageValue);

      expect(setToLocalStorageSpy).toHaveBeenCalled();
      expect(setToLocalStorageSpy).toHaveBeenCalledWith(localStorageKey, localStorageValue);
    });
  });

  describe('Remove item from local storage', () => {
    const removeLocalStorageKey = 'ITEM_TO_REMOVE';
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

  describe('Check if an item exists in local storage', () => {
    it('When the item exists, then true is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const itemExists = localStorageService.exists(localStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(localStorageKey);
      expect(itemExists).toBeTruthy();
    });

    it('When the item does not exist, then false is returned', () => {
      const existingLocalStorageKey = 'ITEM_DOES_NOT_EXIST';
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const itemExists = localStorageService.exists(existingLocalStorageKey);

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(existingLocalStorageKey);
      expect(itemExists).toBeFalsy();
    });
  });

  describe('Check if user completed the tutorial', () => {
    it('When the user completed the tutorial, a value indicating so is returned (true)', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const tutorialCompleted = localStorageService.hasCompletedTutorial(tutorialCompletedId);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.TUTORIAL_COMPLETED_ID);
      expect(tutorialCompleted).toBeTruthy();
    });

    it('When the user did not completed the tutorial, a value indicating so is returned (false)', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      localStorage.removeItem(STORAGE_KEYS.TUTORIAL_COMPLETED_ID);
      const tutorialCompleted = localStorageService.hasCompletedTutorial(tutorialCompletedId);

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.TUTORIAL_COMPLETED_ID);
      expect(tutorialCompleted).toBeFalsy();
    });
  });

  describe('Fetching user data from local storage', () => {
    it('When the user data exists in local storage, then the user is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const userFromLocalStorage = localStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(userLocalStorageKey);
      expect(userFromLocalStorage).toStrictEqual(JSON.parse(stringifyMockedUser));
    });

    it('When the user data does not exist in local storage, then nothing (null) is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      localStorage.removeItem(userLocalStorageKey);
      const userFromLocalStorage = localStorageService.getUser();

      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(userLocalStorageKey);
      expect(userFromLocalStorage).toBeNull();
    });
  });

  describe('Workspaces', () => {
    it('When the workspace item exists, then it is returned', () => {
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      const workspace = localStorageService.getWorkspace();

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(workspaceKey);
      expect(workspace).toStrictEqual(workspaceValueInLocalStorage);
    });

    it('When the workspace item does not exist, then it is returned', () => {
      const workspaceValueInLocalStorage = Workspace.Individuals;
      const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

      localStorage.removeItem(workspaceKey);
      const workspace = localStorageService.getWorkspace();

      expect(getFromLocalStorageSpy).toHaveBeenCalled();
      expect(getFromLocalStorageSpy).toHaveBeenCalledWith(workspaceKey);
      expect(workspace).toStrictEqual(workspaceValueInLocalStorage);
    });

    describe('Get workspace credentials', () => {
      it('When there are credentials from a workspace, then the credentials are returned', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

        const workspaceCredentials = localStorageService.getWorkspaceCredentials();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
        expect(workspaceCredentials).toStrictEqual(JSON.parse(stringifyMockCredentials));
      });

      it('When there are not credentials from a workspace, then a value indicating so is returned (null)', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

        localStorage.removeItem(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
        const workspaceCredentials = localStorageService.getWorkspaceCredentials();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
        expect(workspaceCredentials).toBeNull();
      });
    });

    describe('Get workspace item data', () => {
      it('When a workspace object exists, then the object is returned', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

        const workspaceCredentials = localStorageService.getB2BWorkspace();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.B2B_WORKSPACE);
        expect(workspaceCredentials).toStrictEqual(JSON.parse(stringifyWorkspaceData));
      });

      it('When a workspace object does not exist, then a value indicating so is returned (null)', () => {
        const getFromLocalStorageSpy = vi.spyOn(Storage.prototype, 'getItem');

        localStorage.removeItem(STORAGE_KEYS.B2B_WORKSPACE);
        const workspaceCredentials = localStorageService.getB2BWorkspace();

        expect(getFromLocalStorageSpy).toHaveBeenCalled();
        expect(getFromLocalStorageSpy).toHaveBeenCalledWith(STORAGE_KEYS.B2B_WORKSPACE);
        expect(workspaceCredentials).toBeNull();
      });
    });
  });

  describe('Clearing local storage', () => {
    it('When clear storage is requested, then removes all keys', () => {
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
        STORAGE_KEYS.B2B_WORKSPACE,
        STORAGE_KEYS.WORKSPACE_CREDENTIALS,
        ...Object.values(STORAGE_KEYS.THEMES),
      ];

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      localStorageService.clear();

      expect(setItemSpy).toHaveBeenCalledWith('theme', 'system');

      for (const key of expectedKeysToRemove) {
        expect(removeItemSpy).toHaveBeenCalledWith(key);
      }
    });
  });
});
