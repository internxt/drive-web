import { ListAllSharedFoldersResponse, SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import {
  CreateFolderResponse,
  DriveFileData,
  FetchPaginatedFolderContentResponse,
  FetchTrashContentResponse,
} from '@internxt/sdk/dist/drive/storage/types';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import {
  CreateFolderPayload,
  CreateTeamData,
  CreateWorkspaceSharingPayload,
  FileEntry,
  GetMemberDetailsResponse,
  GetMemberUsageResponse,
  InviteMemberBody,
  ListWorkspaceSharedItemsResponse,
  OrderByOptions,
  PendingInvitesResponse,
  TeamMembers,
  Workspace,
  WorkspaceCredentialsDetails,
  WorkspaceMembers,
  WorkspacePendingInvitations,
  WorkspaceSetupInfo,
  WorkspaceTeamResponse,
  WorkspaceUser,
  WorkspacesResponse,
  UsersAndTeamsAnItemIsShareWidthResponse,
  WorkspaceLogOrderBy,
  WorkspaceLogType,
  WorkspaceLogResponse,
} from '@internxt/sdk/dist/workspaces';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';

export function getWorkspaces(): Promise<WorkspacesResponse> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaces().catch((error) => {
    throw errorService.castError(error);
  });
}

export function getWorkspacesMembers(workspaceId: string): Promise<WorkspaceMembers> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacesMembers(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getWorkspaceTeams(workspaceId: string): Promise<WorkspaceTeamResponse> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacesTeams(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getTeamMembers(teamId: string): Promise<TeamMembers> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacesTeamMembers(teamId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getMemberDetails(workspaceId: string, memberId: string): Promise<GetMemberDetailsResponse> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getMemberDetails(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function inviteUserToTeam(inviteUserBody: InviteMemberBody): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.inviteMemberToWorkspace(inviteUserBody).catch((error) => {
    throw errorService.castError(error);
  });
}

export const processInvitation = async (
  isDeclineAction: boolean,
  invitationId: string,
  token: string,
): Promise<void> => {
  const invitationData = {
    invitationId,
    token,
  };

  const response = isDeclineAction
    ? await declineWorkspaceInvite(invitationData)
    : await acceptWorkspaceInvite(invitationData);

  return response;
};

export function acceptWorkspaceInvite({ invitationId, token }: { invitationId: string; token: string }): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return shareClient.acceptInvitation(invitationId, token).catch((error) => {
    throw errorService.castError(error);
  });
}

export function declineWorkspaceInvite({
  invitationId,
  token,
}: {
  invitationId: string;
  token: string;
}): Promise<void> {
  const shareClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return shareClient.declineInvitation(invitationId, token).catch((error) => {
    throw errorService.castError(error);
  });
}

export function setupWorkspace(workspaceSetupInfo: WorkspaceSetupInfo): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.setupWorkspace(workspaceSetupInfo).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function editWorkspace(
  workspaceId: string,
  details: { name?: string; description?: string; address?: string },
): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.editWorkspace(workspaceId, details).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function updateWorkspaceAvatar(workspaceId: string, avatar: Blob): Promise<{ avatar: string }> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.updateAvatar(workspaceId, { avatar }).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function deleteWorkspaceAvatar(workspaceId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.deleteAvatar(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function createTeam(createTeamData: CreateTeamData): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.createTeam(createTeamData).catch((error) => {
    throw errorService.castError(error);
  });
}

export function editTeam(teamId: string, name: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.editTeam({ teamId, name }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function deleteTeam(workspaceId: string, teamId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.deleteTeam({ workspaceId, teamId }).catch((error) => {
    throw errorService.castError(error);
  });
}

export function addTeamUser(teamId: string, userUuid: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.addTeamUser(teamId, userUuid).catch((error) => {
    throw errorService.castError(error);
  });
}

export function removeTeamUser(teamId: string, userUuid: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.removeTeamUser(teamId, userUuid).catch((error) => {
    throw errorService.castError(error);
  });
}

export function changeTeamManager(workspaceId: string, teamId: string, userId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.changeTeamManager(workspaceId, teamId, userId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function createFileEntry(
  fileEntry: FileEntry,
  workspaceId: string,
  resourcesToken?: string,
): Promise<DriveFileData> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.createFileEntry(fileEntry, workspaceId, resourcesToken).catch((error) => {
    throw errorService.castError(error);
  });
}

export function createFolder(payload: CreateFolderPayload): [Promise<CreateFolderResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.createFolder(payload);
}

export function getWorkspaceCredentials(workspaceId: string): Promise<WorkspaceCredentialsDetails> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceCredentials(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function changeUserRole({
  teamId,
  memberId,
  role,
}: {
  teamId: string;
  memberId: string;
  role: string;
}): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.changeUserRole(teamId, memberId, role).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getWorkspacePendingInvitations(
  workspaceId: string,
  limit: number,
  offset: number,
): Promise<WorkspacePendingInvitations[]> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacePendingInvitations(workspaceId, limit, offset).catch((error) => {
    throw errorService.castError(error);
  });
}
export function getTrashItems(
  workspaceId: string,
  type: 'file' | 'folder',
  offset,
): Promise<FetchTrashContentResponse> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getPersonalTrash(workspaceId, type, offset).catch((error) => {
    throw errorService.castError(error);
  });
}

export function validateWorkspaceInvitation(inviteId: string): Promise<{ uuid: string }> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.validateWorkspaceInvitation(inviteId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getPendingInvites(): Promise<PendingInvitesResponse> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getPendingInvites().catch((error) => {
    throw errorService.castError(error);
  });
}
export function emptyTrash(workspaceId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.emptyPersonalTrash(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function shareItemWithTeam(shareItemWithTeamPayload: CreateWorkspaceSharingPayload): Promise<SharingMeta> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.shareItem(shareItemWithTeamPayload).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getAllWorkspaceTeamSharedFolders(
  workspaceId: string,
  orderBy?: OrderByOptions,
): [Promise<ListAllSharedFoldersResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFoldersV2(workspaceId, orderBy);
}

export function getAllWorkspaceTeamSharedFiles(
  workspaceId: string,
  orderBy?: OrderByOptions,
): [Promise<ListAllSharedFoldersResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFilesV2(workspaceId, orderBy);
}

export function getAllWorkspaceTeamSharedFolderFolders(
  workspaceId: string,
  sharedFolderUUID: string,
  page: number,
  perPage: number,
  token?: string,
  orderBy?: OrderByOptions,
): [Promise<ListWorkspaceSharedItemsResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFolderFoldersV2(
    workspaceId,
    sharedFolderUUID,
    page,
    perPage,
    token,
    orderBy,
  );
}

export function getAllWorkspaceTeamSharedFolderFiles(
  workspaceId: string,
  sharedFolderUUID: string,
  page: number,
  perPage: number,
  token?: string,
  orderBy?: OrderByOptions,
): [Promise<ListWorkspaceSharedItemsResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFolderFilesV2(
    workspaceId,
    sharedFolderUUID,
    page,
    perPage,
    token,
    orderBy,
  );
}

export function getUsersAndTeamsAnItemIsShareWidth({
  workspaceId,
  itemType,
  itemId,
}: {
  workspaceId: string;
  itemId: string;
  itemType: 'folder' | 'file';
}): [Promise<UsersAndTeamsAnItemIsShareWidthResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getUsersAndTeamsAnItemIsShareWidth({ workspaceId, itemType, itemId });
}

export function getWorkspaceFolders(
  workspaceId: string,
  folderId: string,
  offset: number,
  limit: number,
): [Promise<FetchPaginatedFolderContentResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getFolders(workspaceId, folderId, offset, limit, 'plainName', 'ASC');
}
export function getWorkspaceFiles(
  workspaceId: string,
  folderId: string,
  offset: number,
  limit: number,
): [Promise<FetchPaginatedFolderContentResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getFiles(workspaceId, folderId, offset, limit, 'plainName', 'ASC');
}

export function deactivateMember(workspaceId: string, memberId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.deactivateMember(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function reactivateMember(workspaceId: string, memberId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.activateMember(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function removeMember(workspaceId: string, memberId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.removeMember(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getUsage(workspaceId: string): Promise<GetMemberUsageResponse> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getMemberUsage(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}
export function modifyMemberUsage(
  workspaceId: string,
  memberId: string,
  spaceLimitBytes: number,
): Promise<WorkspaceUser> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.modifyMemberUsage(workspaceId, memberId, spaceLimitBytes);
}

export function getWorkspace(workspaceId: string): Promise<Workspace> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspace(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function getWorkspaceUsage(
  workspaceId: string,
): Promise<{ totalWorkspaceSpace: number; spaceAssigned: number; spaceUsed: number }> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceUsage(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export function leaveWorkspace(workspaceId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.leaveWorkspace(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export const getWorkspaceLogs = ({
  workspaceId,
  limit = 50,
  offset = 0,
  member,
  activity,
  lastDays,
  summary,
  orderBy = 'createdAt:DESC',
}: {
  workspaceId: string;
  limit: number;
  offset?: number;
  member?: string;
  activity?: WorkspaceLogType[];
  lastDays?: number;
  summary?: boolean;
  orderBy?: WorkspaceLogOrderBy;
}): Promise<WorkspaceLogResponse[]> => {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient
    .getWorkspaceLogs(workspaceId, limit, offset, member, activity, lastDays, summary, orderBy)
    .catch((error) => {
      throw errorService.castError(error);
    });
};

const workspacesService = {
  getWorkspaces,
  getWorkspacesMembers,
  getWorkspaceTeams,
  getTeamMembers,
  getMemberDetails,
  inviteUserToTeam,
  setupWorkspace,
  editWorkspace,
  updateWorkspaceAvatar,
  deleteWorkspaceAvatar,
  createTeam,
  editTeam,
  deleteTeam,
  addTeamUser,
  removeTeamUser,
  changeTeamManager,
  changeUserRole,
  processInvitation,
  createFileEntry,
  createFolder,
  getWorkspaceCredentials,
  getWorkspacePendingInvitations,
  validateWorkspaceInvitation,
  getPendingInvites,
  acceptWorkspaceInvite,
  declineWorkspaceInvite,
  getTrashItems,
  emptyTrash,
  shareItemWithTeam,
  getAllWorkspaceTeamSharedFiles,
  getAllWorkspaceTeamSharedFolders,
  getAllWorkspaceTeamSharedFolderFiles,
  getAllWorkspaceTeamSharedFolderFolders,
  getUsersAndTeamsAnItemIsShareWidth,
  getWorkspaceFolders,
  getWorkspaceFiles,
  deactivateMember,
  reactivateMember,
  removeMember,
  getUsage,
  modifyMemberUsage,
  getWorkspace,
  leaveWorkspace,
  getWorkspaceLogs,
};

export default workspacesService;
