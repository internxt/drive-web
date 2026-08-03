import { describe, expect, test, vi, beforeEach } from 'vitest';
import { workspaceThunks } from './workspacesStore';
import { PendingWorkspace } from '@internxt/sdk/dist/workspaces';
import { generateNewKeys, hybridDecryptMessageWithPrivateKey } from '../../../crypto/services/pgp.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import workspacesService from 'services/workspace.service';
import { RootState } from '../..';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Buffer } from 'buffer';
import notificationsService from 'app/notifications/services/notifications.service';
const { setupWorkspace, setSelectedWorkspace } = workspaceThunks;
import { workspacesActions } from './workspacesStore';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { decryptMnemonic } from '../../../share/services/share.service';
import encryptedStorageService from 'services/encrypted-storage.service';

vi.mock('i18next', () => ({
  t: vi.fn((key, params) => `${key} ${params?.reason ?? ''}`),
}));

vi.mock('../../../core/types', () => ({
  AppView: vi.fn(),
  LocalStorageItem: vi.fn(),
}));
vi.mock('../../../share/services/share.service', () => ({
  decryptMnemonic: vi.fn(),
}));
vi.mock('../plan', () => ({
  planThunks: { initializeThunk: vi.fn(), fetchBusinessLimitUsageThunk: vi.fn() },
}));
vi.mock('../session/session.thunks', () => ({
  default: {
    changeWorkspaceThunk: vi.fn(),
  },
}));
vi.mock(
  '../../../../views/NewSettings/components/Sections/Workspace/Overview/components/WorkspaceAvatarWrapper',
  () => ({
    deleteWorkspaceAvatarFromDatabase: vi.fn(),
    saveWorkspaceAvatarToDatabase: vi.fn(),
  }),
);
vi.mock('services/navigation.service', () => ({
  default: { push: vi.fn() },
}));
vi.mock('services/workspace.service', () => ({
  default: {
    setupWorkspace: vi.fn(),
    getWorkspaces: vi.fn(() =>
      Promise.resolve({
        availableWorkspaces: [],
        pendingWorkspaces: [],
      }),
    ),
    updateWorkspaceAvatar: vi.fn(),
    deleteWorkspaceAvatar: vi.fn(),
    editWorkspace: vi.fn(),
    getWorkspaceCredentials: vi.fn(),
  },
}));
vi.mock('services/local-storage.service', () => ({
  default: {
    set: vi.fn(),
    get: vi.fn(),
    getB2BWorkspaceId: vi.fn(),
  },
}));

vi.mock('services/encrypted-storage.service', () => ({
  default: {
    setB2BWorkspace: vi.fn(),
    clearB2BWorkspace: vi.fn(),
    getB2BWorkspaceMnemonic: vi.fn(),
  },
}));
vi.mock('services', () => ({
  errorService: {
    reportError: vi.fn(),
    castError: vi.fn((err) => ({ message: err?.message || 'Unknown error', requestId: 'test-request-id' })),
  },
}));

vi.mock('./workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
  },
}));

describe('setSelectedWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWorkspace = {
    workspace: { id: 'ws-1' },
    workspaceUser: { key: 'decrypted-key' },
  } as WorkspaceData;

  test('unselects workspace when workspaceId is null', async () => {
    const dispatchMock = vi.fn();
    const getStateMock = vi.fn(
      (): RootState =>
        ({
          workspaces: { selectedWorkspace: mockWorkspace, workspaces: [mockWorkspace] },
        }) as RootState,
    );

    await setSelectedWorkspace({ workspaceId: null })(dispatchMock, getStateMock, undefined);

    expect(encryptedStorageService.clearB2BWorkspace).toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledWith(workspacesActions.setSelectedWorkspace(null));
    expect(dispatchMock).toHaveBeenCalledWith(workspacesActions.setCredentials(null));
  });

  test('reuses selected workspace when it matches id in localStorage and current state', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(mockWorkspace.workspace.id);
    const dispatchMock = vi.fn();
    const getStateMock = vi.fn(
      (): RootState =>
        ({
          workspaces: { selectedWorkspace: mockWorkspace, workspaces: [mockWorkspace] },
        }) as RootState,
    );

    await setSelectedWorkspace({ workspaceId: mockWorkspace.workspace.id })(dispatchMock, getStateMock, undefined);

    expect(dispatchMock).toHaveBeenCalledWith(workspacesActions.setSelectedWorkspace(mockWorkspace));
    expect(encryptedStorageService.setB2BWorkspace).not.toHaveBeenCalled();
  });

  test('selects a new workspace found in state.workspaces.workspaces and fetches credentials', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue('some-other-id');
    const dispatchMock = vi.fn();
    const getStateMock = vi.fn(
      (): RootState =>
        ({
          workspaces: { selectedWorkspace: null, workspaces: [mockWorkspace] },
        }) as RootState,
    );

    await setSelectedWorkspace({ workspaceId: mockWorkspace.workspace.id })(dispatchMock, getStateMock, undefined);

    expect(encryptedStorageService.setB2BWorkspace).toHaveBeenCalledWith('ws-1', 'decrypted-key');
    expect(dispatchMock).toHaveBeenCalledWith(workspacesActions.setSelectedWorkspace(mockWorkspace));
  });

  test('does nothing when workspaceId is not found in state.workspaces.workspaces', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const dispatchMock = vi.fn();
    const getStateMock = vi.fn(
      (): RootState =>
        ({
          workspaces: { selectedWorkspace: null, workspaces: [] as WorkspaceData[] },
        }) as RootState,
    );

    await setSelectedWorkspace({ workspaceId: mockWorkspace.workspace.id })(dispatchMock, getStateMock, undefined);

    expect(dispatchMock).not.toHaveBeenCalledWith(workspacesActions.setSelectedWorkspace(expect.anything()));
    expect(encryptedStorageService.setB2BWorkspace).not.toHaveBeenCalled();
  });

  test('re-fetches state after dispatching fetchWorkspaces to find newly loaded workspace', async () => {
    vi.spyOn(localStorageService, 'get').mockReturnValue(null);
    const dispatchMock = vi.fn();
    const getStateMock = vi
      .fn()
      .mockReturnValueOnce({
        workspaces: { selectedWorkspace: null, workspaces: [] },
      })
      .mockReturnValueOnce({
        workspaces: { selectedWorkspace: null, workspaces: [mockWorkspace] },
      });

    await setSelectedWorkspace({ workspaceId: mockWorkspace.workspace.id })(dispatchMock, getStateMock, undefined);

    expect(getStateMock).toHaveBeenCalledTimes(2);
    expect(localStorageService.setB2BWorkspace).toHaveBeenCalledWith('ws-1', 'decrypted-key');
    expect(dispatchMock).toHaveBeenCalledWith(workspacesActions.setSelectedWorkspace(mockWorkspace));
  });
});

describe('Encryption and Decryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function getMockPendingWorkspace() {
    const mockPendingWorkspace: PendingWorkspace = {
      id: 'mock-id',
      name: 'mock-name',
      address: 'mock-adress',
      description: 'mock-description',
      createdAt: 'mock-createdAt',
      defaultTeamId: 'mock-defaultTeamId',
      ownerId: 'mock-ownerId',
      setupCompleted: false,
      updatedAt: 'mock-updatedAt',
      workspaceUserId: 'mock-workspaceUserId',
    };

    return mockPendingWorkspace;
  }

  test('sets selected workspace and related side effects after setup completes', async () => {
    const keys = await generateNewKeys();

    const mockUser: Partial<UserSettings> = {
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: keys.privateKeyArmored,
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: keys.privateKyberKeyBase64,
        },
      },
    };

    const mockPendingWorkspace = getMockPendingWorkspace();

    const mockRootState: Partial<RootState> = {
      user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
    };
    const dispatchMock = vi.fn();
    const getStateMock = vi.fn(() => mockRootState as RootState);

    const mockSelectedWorkspace = {
      workspace: { id: mockPendingWorkspace.id },
      workspaceUser: { key: 'decrypted-key' },
    } as unknown as WorkspaceData;

    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
    vi.spyOn(encryptedStorageService, 'setB2BWorkspace').mockResolvedValue(undefined);
    vi.spyOn(workspacesService, 'setupWorkspace').mockResolvedValue(undefined);
    vi.spyOn(workspacesService, 'getWorkspaces').mockResolvedValue({
      availableWorkspaces: [mockSelectedWorkspace],
      pendingWorkspaces: [],
    });
    vi.mocked(decryptMnemonic).mockImplementation(async (key) => key);

    await setupWorkspace({ pendingWorkspace: mockPendingWorkspace })(dispatchMock, getStateMock, undefined);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(encryptedStorageService.setB2BWorkspace).toHaveBeenCalledWith(mockPendingWorkspace.id, 'decrypted-key');
  });

  test('should setup workspace and encrypt mnemonic', async () => {
    const keys = await generateNewKeys();
    const mockUser: Partial<UserSettings> = {
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
      keys: {
        ecc: {
          publicKey: keys.publicKeyArmored,
          privateKey: keys.privateKeyArmored,
        },
        kyber: {
          publicKey: keys.publicKyberKeyBase64,
          privateKey: keys.privateKyberKeyBase64,
        },
      },
    };

    const mockRootState: Partial<RootState> = {
      user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
    };
    const dispatchMock = vi.fn();
    const getStateMock = vi.fn(() => mockRootState as RootState);

    const mockPendingWorkspace = getMockPendingWorkspace();

    const mockWorkspaceService = {
      setupWorkspace: vi.fn(),
      getWorkspaces: vi.fn(),
    };
    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
    vi.spyOn(workspacesService, 'setupWorkspace').mockImplementation(mockWorkspaceService.setupWorkspace);
    vi.spyOn(workspacesService, 'getWorkspaces').mockImplementation(mockWorkspaceService.getWorkspaces);

    await setupWorkspace({ pendingWorkspace: mockPendingWorkspace })(dispatchMock, getStateMock, undefined);

    const [workspaceSetupInfo] = mockWorkspaceService.setupWorkspace.mock.calls[0];
    expect(workspaceSetupInfo.encryptedMnemonic).toBeDefined();

    const { encryptedMnemonic } = workspaceSetupInfo;
    const decryptedMessage = await hybridDecryptMessageWithPrivateKey({
      encryptedMessageInBase64: encryptedMnemonic,
      privateKeyInBase64: Buffer.from(keys.privateKeyArmored).toString('base64'),
      privateKyberKeyInBase64: keys.privateKyberKeyBase64,
    });

    expect(decryptedMessage).toEqual(mockUser.mnemonic);
    expect(mockWorkspaceService.setupWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedMnemonic: encryptedMnemonic,
        name: mockPendingWorkspace.name,
        workspaceId: mockPendingWorkspace.id,
        address: mockPendingWorkspace.address,
        description: mockPendingWorkspace.description,
      }),
    );
  });

  test('should throw setup workspace error if keys are empty', async () => {
    const mockUser: Partial<UserSettings> = {
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
    };

    const mockRootState: Partial<RootState> = {
      user: { user: mockUser as UserSettings, isInitializing: false, isAuthenticated: false, isInitialized: false },
    };
    const dispatchMock = vi.fn();
    const getStateMock = vi.fn(() => mockRootState as RootState);

    const mockPendingWorkspace = getMockPendingWorkspace();

    const mockWorkspaceService = {
      setupWorkspace: vi.fn(),
      getWorkspaces: vi.fn(),
    };
    vi.spyOn(navigationService, 'push').mockImplementation(() => {});
    vi.spyOn(localStorageService, 'set').mockImplementation(() => {});
    vi.spyOn(workspacesService, 'setupWorkspace').mockImplementation(mockWorkspaceService.setupWorkspace);
    vi.spyOn(workspacesService, 'getWorkspaces').mockImplementation(mockWorkspaceService.getWorkspaces);
    const showSpy = vi.spyOn(notificationsService, 'show');

    await setupWorkspace({ pendingWorkspace: mockPendingWorkspace })(dispatchMock, getStateMock, undefined);

    expect(mockWorkspaceService.setupWorkspace).not.toHaveBeenCalled();

    expect(showSpy).toHaveBeenCalledWith({
      text: expect.any(String),
      type: 'error',
      requestId: 'test-request-id',
    });
  });
});
