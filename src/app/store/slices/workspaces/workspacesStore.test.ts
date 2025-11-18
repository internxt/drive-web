import { describe, expect, it, vi, beforeEach } from 'vitest';
import { workspaceThunks } from './workspacesStore';
const { setupWorkspace } = workspaceThunks;
import { PendingWorkspace } from '@internxt/sdk/dist/workspaces';
import { generateNewKeys, hybridDecryptMessageWithPrivateKey } from '../../../crypto/services/pgp.service';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import workspacesService from 'services/workspace.service';
import { RootState } from '../..';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Buffer } from 'buffer';
import notificationsService from 'app/notifications/services/notifications.service';

vi.mock('i18next', () => ({
  t: vi.fn((key, params) => `${key} ${params?.reason ?? ''}`),
}));

vi.mock('../../../core/types', () => ({
  AppView: vi.fn(),
}));
vi.mock('../../../share/services/share.service', () => ({
  decryptMnemonic: vi.fn(),
}));
vi.mock('../plan', () => ({
  planThunks: vi.fn(),
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
vi.mock('./workspaces.selectors', () => ({
  default: {
    getSelectedWorkspace: vi.fn(),
  },
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
    getB2BWorkspace: vi.fn(),
  },
}));

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

  it('should setup workspace and encrypt mnemonic', async () => {
    const keys = await generateNewKeys();
    const mockUser: Partial<UserSettings> = {
      mnemonic:
        'truck arch rather sell tilt return warm nurse rack vacuum rubber tribe unfold scissors copper sock panel ozone harsh ahead danger soda legal state',
      publicKey: keys.publicKeyArmored,
      privateKey: Buffer.from(keys.privateKeyArmored).toString('base64'),
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

  it('should throw setup workspace error if keys are empty', async () => {
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
      text: 'Error setting up workspace',
      type: 'error',
    });
  });
});
