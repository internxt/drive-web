import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { workspaceThunks } from './workspacesStore';
const { setupWorkspace } = workspaceThunks;
import { PendingWorkspace } from '@internxt/sdk/dist/workspaces';
import { generateNewKeys, hybridDecryptMessageWithPrivateKey } from '../../../crypto/services/pgp.service';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import workspacesService from '../../../core/services/workspace.service';
import { RootState } from '../..';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Buffer } from 'buffer';
import notificationsService from 'app/notifications/services/notifications.service';

describe('Encryption and Decryption', () => {
  beforeAll(() => {
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
    vi.mock('../../../newSettings/Sections/Workspace/Overview/components/WorkspaceAvatarWrapper', () => ({
      deleteWorkspaceAvatarFromDatabase: vi.fn(),
      saveWorkspaceAvatarToDatabase: vi.fn(),
    }));
    vi.mock('../../../core/services/navigation.service', () => ({
      default: { push: vi.fn() },
    }));
    vi.mock('./workspaces.selectors', () => ({
      default: {
        getSelectedWorkspace: vi.fn(),
      },
    }));
    vi.mock('../../../core/services/workspace.service', () => ({
      default: {
        setupWorkspace: vi.fn(),
        getWorkspaces: vi.fn(),
        updateWorkspaceAvatar: vi.fn(),
        deleteWorkspaceAvatar: vi.fn(),
        editWorkspace: vi.fn(),
        getWorkspaceCredentials: vi.fn(),
      },
    }));
    vi.mock('../../../core/services/local-storage.service', () => ({
      default: {
        set: vi.fn(),
        getB2BWorkspace: vi.fn(),
      },
      STORAGE_KEYS: {
        TUTORIAL_COMPLETED_ID: 'signUpTutorialCompleted',
        B2B_WORKSPACE: 'b2bWorkspace',
        WORKSPACE_CREDENTIALS: 'workspace_credentials',
      },
    }));
    vi.mock('../../../notifications/services/notifications.service', () => ({
      default: {
        show: vi.fn(),
      },
      ToastType: {
        Error: 'ERROR',
      },
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(()=> {
    vi.resetAllMocks();
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

    await setupWorkspace({ pendingWorkspace: mockPendingWorkspace })(dispatchMock, getStateMock, undefined);

    expect(mockWorkspaceService.setupWorkspace).not.toHaveBeenCalled();

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'Error setting up workspace',
      type: 'ERROR',
    });
  });
});
