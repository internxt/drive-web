import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceLogType } from '@internxt/sdk/dist/workspaces';
import errorService from './error.service';
import workspacesService, * as workspaceService from './workspace.service';

const mockIds = {
  workspaceId: 'workspace-123',
  teamId: 'team-456',
  memberId: 'member-789',
  invitationId: 'invitation-abc',
  token: 'token-xyz',
  uuid: 'uuid-def',
};

const mockWorkspacesClient = {
  getWorkspaces: vi.fn(),
  getWorkspacesMembers: vi.fn(),
  getWorkspacesTeams: vi.fn(),
  getWorkspacesTeamMembers: vi.fn(),
  getMemberDetails: vi.fn(),
  inviteMemberToWorkspace: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
  setupWorkspace: vi.fn(),
  editWorkspace: vi.fn(),
  updateAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
  createTeam: vi.fn(),
  editTeam: vi.fn(),
  deleteTeam: vi.fn(),
  addTeamUser: vi.fn(),
  removeTeamUser: vi.fn(),
  changeTeamManager: vi.fn(),
  createFileEntry: vi.fn(),
  createFolder: vi.fn(),
  getWorkspaceCredentials: vi.fn(),
  changeUserRole: vi.fn(),
  getWorkspacePendingInvitations: vi.fn(),
  getPersonalTrash: vi.fn(),
  validateWorkspaceInvitation: vi.fn(),
  getPendingInvites: vi.fn(),
  emptyPersonalTrash: vi.fn(),
  shareItem: vi.fn(),
  getWorkspaceTeamSharedFoldersV2: vi.fn(),
  getWorkspaceTeamSharedFilesV2: vi.fn(),
  getWorkspaceTeamSharedFolderFoldersV2: vi.fn(),
  getWorkspaceTeamSharedFolderFilesV2: vi.fn(),
  getUsersAndTeamsAnItemIsShareWidth: vi.fn(),
  getFolders: vi.fn(),
  getFiles: vi.fn(),
  deactivateMember: vi.fn(),
  activateMember: vi.fn(),
  removeMember: vi.fn(),
  getMemberUsage: vi.fn(),
  modifyMemberUsage: vi.fn(),
  getWorkspace: vi.fn(),
  getWorkspaceUsage: vi.fn(),
  leaveWorkspace: vi.fn(),
  getWorkspaceLogs: vi.fn(),
};

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createWorkspacesClient: vi.fn(() => mockWorkspacesClient),
    })),
  },
}));

vi.mock('./error.service', () => ({
  default: {
    castError: vi.fn((error) => error),
  },
}));

const testErrorHandling = async (fn: () => Promise<any>, mockFn: any) => {
  const mockError = new Error('Test error');
  mockFn.mockRejectedValue(mockError);
  await expect(fn()).rejects.toThrow();
  expect(errorService.castError).toHaveBeenCalledWith(mockError);
};

describe('workspace service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('When retrieving workspace information', () => {
    it.each([
      {
        name: 'all workspaces',
        fn: 'getWorkspaces',
        args: [],
        mockData: { workspaces: [{ id: mockIds.workspaceId }] },
      },
      {
        name: 'specific workspace',
        fn: 'getWorkspace',
        args: [mockIds.workspaceId],
        mockData: { id: mockIds.workspaceId },
      },
    ])('should return $name', async ({ fn, args, mockData }) => {
      mockWorkspacesClient[fn].mockResolvedValue(mockData);
      const result = await workspaceService[fn](...args);
      expect(result).toEqual(mockData);
      expect(mockWorkspacesClient[fn]).toHaveBeenCalledWith(...args);
    });

    it('should handle errors when retrieving workspace fails', async () => {
      await testErrorHandling(
        () => workspaceService.getWorkspace(mockIds.workspaceId),
        mockWorkspacesClient.getWorkspace,
      );
    });
  });

  describe('When managing workspace members', () => {
    it.each([
      {
        name: 'workspace members',
        fn: 'getWorkspacesMembers',
        args: [mockIds.workspaceId],
        mockData: { members: [{ id: mockIds.memberId }] },
      },
      {
        name: 'member details',
        fn: 'getMemberDetails',
        args: [mockIds.workspaceId, mockIds.memberId],
        mockData: { id: mockIds.memberId, email: 'test@example.com' },
      },
    ])('should return $name', async ({ fn, args, mockData }) => {
      mockWorkspacesClient[fn].mockResolvedValue(mockData);
      const result = await workspaceService[fn](...args);
      expect(result).toEqual(mockData);
      expect(mockWorkspacesClient[fn]).toHaveBeenCalledWith(...args);
    });

    it('should invite a user to the team', async () => {
      const inviteBody = {
        invitedUserEmail: 'user@example.com',
        workspaceId: mockIds.workspaceId,
        encryptedMnemonicInBase64: 'encrypted',
        encryptionAlgorithm: 'aes-256-gcm',
        message: 'Welcome',
      };
      mockWorkspacesClient.inviteMemberToWorkspace.mockResolvedValue(undefined);
      await workspaceService.inviteUserToTeam(inviteBody);
      expect(mockWorkspacesClient.inviteMemberToWorkspace).toHaveBeenCalledWith(inviteBody);
    });

    it.each([
      { name: 'deactivate', clientFn: 'deactivateMember', serviceFn: 'deactivateMember' },
      { name: 'reactivate', clientFn: 'activateMember', serviceFn: 'reactivateMember' },
      { name: 'remove', clientFn: 'removeMember', serviceFn: 'removeMember' },
    ])('should $name a member', async ({ clientFn, serviceFn }) => {
      mockWorkspacesClient[clientFn].mockResolvedValue(undefined);
      await workspaceService[serviceFn](mockIds.workspaceId, mockIds.memberId);
      expect(mockWorkspacesClient[clientFn]).toHaveBeenCalledWith(mockIds.workspaceId, mockIds.memberId);
    });

    it('should handle errors when member action fails', async () => {
      await testErrorHandling(
        () => workspaceService.removeMember(mockIds.workspaceId, mockIds.memberId),
        mockWorkspacesClient.removeMember,
      );
    });
  });

  describe('When handling workspace invitations', () => {
    it.each([
      { name: 'accept', fn: 'acceptWorkspaceInvite', clientFn: 'acceptInvitation' },
      { name: 'decline', fn: 'declineWorkspaceInvite', clientFn: 'declineInvitation' },
    ])('should $name an invitation', async ({ fn, clientFn }) => {
      mockWorkspacesClient[clientFn].mockResolvedValue(undefined);
      await workspaceService[fn]({ invitationId: mockIds.invitationId, token: mockIds.token });
      expect(mockWorkspacesClient[clientFn]).toHaveBeenCalledWith(mockIds.invitationId, mockIds.token);
    });

    it.each([
      { isDecline: false, expectedMethod: 'acceptInvitation' },
      { isDecline: true, expectedMethod: 'declineInvitation' },
    ])('should process invitation correctly when decline is $isDecline', async ({ isDecline, expectedMethod }) => {
      mockWorkspacesClient[expectedMethod].mockResolvedValue(undefined);
      await workspaceService.processInvitation(isDecline, mockIds.invitationId, mockIds.token);
      expect(mockWorkspacesClient[expectedMethod]).toHaveBeenCalledWith(mockIds.invitationId, mockIds.token);
    });

    it.each([
      {
        name: 'workspace invitation',
        fn: 'validateWorkspaceInvitation',
        args: [mockIds.invitationId],
        mockData: { uuid: mockIds.uuid },
      },
      {
        name: 'pending invitations',
        fn: 'getWorkspacePendingInvitations',
        args: [mockIds.workspaceId, 10, 0],
        mockData: [{ id: mockIds.invitationId }],
      },
      { name: 'all pending invites', fn: 'getPendingInvites', args: [], mockData: { invites: [] } },
    ])('should retrieve $name', async ({ fn, args, mockData }) => {
      mockWorkspacesClient[fn].mockResolvedValue(mockData);
      const result = await workspaceService[fn](...args);
      expect(result).toEqual(mockData);
    });
  });

  describe('When managing workspace settings', () => {
    it('should set up a new workspace', async () => {
      const setupInfo = {
        workspaceId: mockIds.workspaceId,
        name: 'New Workspace',
        description: 'Description',
        address: '123 Main St',
        encryptedMnemonic: 'encrypted',
      };
      mockWorkspacesClient.setupWorkspace.mockResolvedValue(undefined);
      await workspaceService.setupWorkspace(setupInfo);
      expect(mockWorkspacesClient.setupWorkspace).toHaveBeenCalledWith(setupInfo);
    });

    it('should edit workspace details', async () => {
      const details = { name: 'Updated Name' };
      mockWorkspacesClient.editWorkspace.mockResolvedValue(undefined);
      await workspaceService.editWorkspace(mockIds.workspaceId, details);
      expect(mockWorkspacesClient.editWorkspace).toHaveBeenCalledWith(mockIds.workspaceId, details);
    });

    it('should update workspace avatar', async () => {
      const mockAvatar = new Blob(['avatar'], { type: 'image/png' });
      const mockData = { avatar: 'avatar-url' };
      mockWorkspacesClient.updateAvatar.mockResolvedValue(mockData);
      const result = await workspaceService.updateWorkspaceAvatar(mockIds.workspaceId, mockAvatar);
      expect(result).toEqual(mockData);
      expect(mockWorkspacesClient.updateAvatar).toHaveBeenCalledWith(mockIds.workspaceId, { avatar: mockAvatar });
    });

    it.each([
      { name: 'delete avatar', fn: 'deleteWorkspaceAvatar', clientFn: 'deleteAvatar' },
      { name: 'leave workspace', fn: 'leaveWorkspace', clientFn: 'leaveWorkspace' },
    ])('should $name', async ({ fn, clientFn }) => {
      mockWorkspacesClient[clientFn].mockResolvedValue(undefined);
      await workspaceService[fn](mockIds.workspaceId);
      expect(mockWorkspacesClient[clientFn]).toHaveBeenCalledWith(mockIds.workspaceId);
    });

    it('should handle errors when deleting avatar fails', async () => {
      await testErrorHandling(
        () => workspaceService.deleteWorkspaceAvatar(mockIds.workspaceId),
        mockWorkspacesClient.deleteAvatar,
      );
    });
  });

  describe('When managing teams', () => {
    it.each([
      { name: 'workspace teams', fn: 'getWorkspaceTeams', args: [mockIds.workspaceId], mockData: { teams: [] } },
      { name: 'team members', fn: 'getTeamMembers', args: [mockIds.teamId], mockData: { members: [] } },
    ])('should return $name', async ({ fn, args, mockData }) => {
      mockWorkspacesClient[
        fn === 'getWorkspaceTeams' ? 'getWorkspacesTeams' : 'getWorkspacesTeamMembers'
      ].mockResolvedValue(mockData);
      const result = await workspaceService[fn](...args);
      expect(result).toEqual(mockData);
    });

    it('should create a new team', async () => {
      const teamData = { workspaceId: mockIds.workspaceId, name: 'Team', managerId: mockIds.memberId };
      mockWorkspacesClient.createTeam.mockResolvedValue(undefined);
      await workspaceService.createTeam(teamData);
      expect(mockWorkspacesClient.createTeam).toHaveBeenCalledWith(teamData);
    });

    it('should edit team name', async () => {
      mockWorkspacesClient.editTeam.mockResolvedValue(undefined);
      await workspaceService.editTeam(mockIds.teamId, 'New Name');
      expect(mockWorkspacesClient.editTeam).toHaveBeenCalledWith({ teamId: mockIds.teamId, name: 'New Name' });
    });

    it('should delete a team', async () => {
      mockWorkspacesClient.deleteTeam.mockResolvedValue(undefined);
      await workspaceService.deleteTeam(mockIds.workspaceId, mockIds.teamId);
      expect(mockWorkspacesClient.deleteTeam).toHaveBeenCalledWith({
        workspaceId: mockIds.workspaceId,
        teamId: mockIds.teamId,
      });
    });

    it.each([
      { name: 'add', fn: 'addTeamUser', service: 'addTeamUser' },
      { name: 'remove', fn: 'removeTeamUser', service: 'removeTeamUser' },
    ])('should $name a user to/from team', async ({ fn, service }) => {
      mockWorkspacesClient[fn].mockResolvedValue(undefined);
      await workspaceService[service](mockIds.teamId, mockIds.uuid);
      expect(mockWorkspacesClient[fn]).toHaveBeenCalledWith(mockIds.teamId, mockIds.uuid);
    });

    it('should change team manager', async () => {
      mockWorkspacesClient.changeTeamManager.mockResolvedValue(undefined);
      await workspaceService.changeTeamManager(mockIds.workspaceId, mockIds.teamId, mockIds.memberId);
      expect(mockWorkspacesClient.changeTeamManager).toHaveBeenCalledWith(
        mockIds.workspaceId,
        mockIds.teamId,
        mockIds.memberId,
      );
    });

    it('should change user role', async () => {
      const roleData = { teamId: mockIds.teamId, memberId: mockIds.memberId, role: 'admin' };
      mockWorkspacesClient.changeUserRole.mockResolvedValue(undefined);
      await workspaceService.changeUserRole(roleData);
      expect(mockWorkspacesClient.changeUserRole).toHaveBeenCalledWith(mockIds.teamId, mockIds.memberId, 'admin');
    });
  });

  describe('When managing files and folders', () => {
    it('should create a file entry', async () => {
      const fileEntry = {
        name: 'doc.pdf',
        size: 1024,
        bucket: 'bucket-123',
        fileId: 'file-id',
        encryptVersion: '03-aes',
        folderUuid: 'folder-uuid',
        type: 'pdf' as const,
        plainName: 'doc.pdf',
        modificationTime: '2023-01-01T00:00:00Z',
        date: '2023-01-01T00:00:00Z',
      };
      const mockData = { id: 'file-123' };
      mockWorkspacesClient.createFileEntry.mockResolvedValue(mockData);
      const result = await workspaceService.createFileEntry(fileEntry, mockIds.workspaceId, 'token');
      expect(result).toEqual(mockData);
      expect(mockWorkspacesClient.createFileEntry).toHaveBeenCalledWith(fileEntry, mockIds.workspaceId, 'token');
    });

    it('should create a folder', () => {
      const payload = { workspaceId: mockIds.workspaceId, plainName: 'Folder', parentFolderUuid: 'parent-uuid' };
      const mockPromise = Promise.resolve({ id: 'folder-123' });
      const mockCanceler = vi.fn();
      mockWorkspacesClient.createFolder.mockReturnValue([mockPromise, mockCanceler]);
      const [promise, canceler] = workspaceService.createFolder(payload);
      expect(promise).toBe(mockPromise);
      expect(canceler).toBe(mockCanceler);
    });

    it.each([
      { type: 'folders', fn: 'getWorkspaceFolders', clientFn: 'getFolders' },
      { type: 'files', fn: 'getWorkspaceFiles', clientFn: 'getFiles' },
    ])('should retrieve workspace $type', ({ fn, clientFn }) => {
      const mockPromise = Promise.resolve({ items: [] });
      const mockCanceler = vi.fn();
      mockWorkspacesClient[clientFn].mockReturnValue([mockPromise, mockCanceler]);
      const [promise] = workspaceService[fn](mockIds.workspaceId, 'folder-id', 0, 50);
      expect(promise).toBe(mockPromise);
      expect(mockWorkspacesClient[clientFn]).toHaveBeenCalledWith(
        mockIds.workspaceId,
        'folder-id',
        0,
        50,
        'plainName',
        'ASC',
      );
    });
  });

  describe('When managing trash', () => {
    it.each(['file', 'folder'] as const)('should retrieve trash items for %s', async (type) => {
      const mockData = { items: [] };
      mockWorkspacesClient.getPersonalTrash.mockResolvedValue(mockData);
      const result = await workspaceService.getTrashItems(mockIds.workspaceId, type, 0);
      expect(result).toEqual(mockData);
      expect(mockWorkspacesClient.getPersonalTrash).toHaveBeenCalledWith(mockIds.workspaceId, type, 0);
    });

    it('should empty trash', async () => {
      mockWorkspacesClient.emptyPersonalTrash.mockResolvedValue(undefined);
      await workspaceService.emptyTrash(mockIds.workspaceId);
      expect(mockWorkspacesClient.emptyPersonalTrash).toHaveBeenCalledWith(mockIds.workspaceId);
    });

    it('should handle errors when emptying trash fails', async () => {
      await testErrorHandling(
        () => workspaceService.emptyTrash(mockIds.workspaceId),
        mockWorkspacesClient.emptyPersonalTrash,
      );
    });
  });

  describe('When managing shared items', () => {
    it('should share an item with team', async () => {
      const payload = {
        workspaceId: mockIds.workspaceId,
        itemType: 'folder' as const,
        itemId: 'item-123',
        teamUUID: mockIds.teamId,
        roleId: 'role-123',
        encryptedPassword: 'encrypted',
      };
      const mockData = { shareId: 'share-123' };
      mockWorkspacesClient.shareItem.mockResolvedValue(mockData);
      const result = await workspaceService.shareItemWithTeam(payload);
      expect(result).toEqual(mockData);
    });

    it.each([
      { type: 'folders', fn: 'getAllWorkspaceTeamSharedFolders', clientFn: 'getWorkspaceTeamSharedFoldersV2' },
      { type: 'files', fn: 'getAllWorkspaceTeamSharedFiles', clientFn: 'getWorkspaceTeamSharedFilesV2' },
    ])('should retrieve all shared $type', ({ fn, clientFn }) => {
      const mockPromise = Promise.resolve({ items: [] });
      const mockCanceler = vi.fn();
      mockWorkspacesClient[clientFn].mockReturnValue([mockPromise, mockCanceler]);
      const [promise] = workspaceService[fn](mockIds.workspaceId);
      expect(promise).toBe(mockPromise);
    });

    it.each([
      {
        type: 'folders',
        fn: 'getAllWorkspaceTeamSharedFolderFolders',
        clientFn: 'getWorkspaceTeamSharedFolderFoldersV2',
      },
      { type: 'files', fn: 'getAllWorkspaceTeamSharedFolderFiles', clientFn: 'getWorkspaceTeamSharedFolderFilesV2' },
    ])('should retrieve $type within shared folder', ({ fn, clientFn }) => {
      const mockPromise = Promise.resolve({ items: [] });
      const mockCanceler = vi.fn();
      mockWorkspacesClient[clientFn].mockReturnValue([mockPromise, mockCanceler]);
      const [promise] = workspaceService[fn](mockIds.workspaceId, 'shared-uuid', 1, 50);
      expect(promise).toBe(mockPromise);
    });

    it('should retrieve users and teams an item is shared with', () => {
      const mockPromise = Promise.resolve({ users: [], teams: [] });
      const mockCanceler = vi.fn();
      mockWorkspacesClient.getUsersAndTeamsAnItemIsShareWidth.mockReturnValue([mockPromise, mockCanceler]);
      const [promise] = workspaceService.getUsersAndTeamsAnItemIsShareWidth({
        workspaceId: mockIds.workspaceId,
        itemType: 'folder',
        itemId: 'item-123',
      });
      expect(promise).toBe(mockPromise);
    });
  });

  describe('When managing workspace credentials and usage', () => {
    it.each([
      {
        name: 'workspace credentials',
        fn: 'getWorkspaceCredentials',
        clientFn: 'getWorkspaceCredentials',
        args: [mockIds.workspaceId],
        mockData: { publicKey: 'key-123' },
      },
      {
        name: 'member usage',
        fn: 'getUsage',
        clientFn: 'getMemberUsage',
        args: [mockIds.workspaceId],
        mockData: { used: 1024, total: 5120 },
      },
      {
        name: 'workspace usage',
        fn: 'getWorkspaceUsage',
        clientFn: 'getWorkspaceUsage',
        args: [mockIds.workspaceId],
        mockData: { totalWorkspaceSpace: 10240, spaceAssigned: 5120, spaceUsed: 2048 },
      },
    ])('should retrieve $name', async ({ fn, clientFn, args, mockData }) => {
      mockWorkspacesClient[clientFn].mockResolvedValue(mockData);
      const result = await workspaceService[fn](...args);
      expect(result).toEqual(mockData);
    });

    it('should modify member usage limit', async () => {
      const mockData = { id: mockIds.memberId, spaceLimit: 10240 };
      mockWorkspacesClient.modifyMemberUsage.mockResolvedValue(mockData);
      const result = await workspaceService.modifyMemberUsage(mockIds.workspaceId, mockIds.memberId, 10240);
      expect(result).toEqual(mockData);
    });

    it('should handle errors when retrieving workspace usage fails', async () => {
      await testErrorHandling(
        () => workspaceService.getWorkspaceUsage(mockIds.workspaceId),
        mockWorkspacesClient.getWorkspaceUsage,
      );
    });
  });

  describe('When retrieving workspace logs', () => {
    it.each([
      {
        name: 'default parameters',
        params: { workspaceId: mockIds.workspaceId, limit: 50 },
        expectedCall: [mockIds.workspaceId, 50, 0, undefined, undefined, undefined, undefined, 'createdAt:DESC'],
      },
      {
        name: 'custom filters',
        params: {
          workspaceId: mockIds.workspaceId,
          limit: 100,
          offset: 10,
          member: mockIds.memberId,
          activity: [WorkspaceLogType.ShareFile, WorkspaceLogType.ShareFolder],
          lastDays: 7,
          summary: true,
          orderBy: 'createdAt:ASC',
        },
        expectedCall: [
          mockIds.workspaceId,
          100,
          10,
          mockIds.memberId,
          [WorkspaceLogType.ShareFile, WorkspaceLogType.ShareFolder],
          7,
          true,
          'createdAt:ASC',
        ],
      },
    ])('should retrieve workspace activity logs with $name', async ({ params, expectedCall }) => {
      const mockData = [{ id: 'log-1' }];
      mockWorkspacesClient.getWorkspaceLogs.mockResolvedValue(mockData);
      const result = await workspaceService.getWorkspaceLogs(params);
      expect(result).toEqual(mockData);
      expect(mockWorkspacesClient.getWorkspaceLogs).toHaveBeenCalledWith(...expectedCall);
    });

    it('should handle errors when retrieving logs fails', async () => {
      await testErrorHandling(
        () => workspaceService.getWorkspaceLogs({ workspaceId: mockIds.workspaceId, limit: 50 }),
        mockWorkspacesClient.getWorkspaceLogs,
      );
    });
  });
});
