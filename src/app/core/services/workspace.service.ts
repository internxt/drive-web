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
  InviteMemberBody,
  ListWorkspaceSharedItemsResponse,
  OrderByOptions,
  WorkspaceCredentialsDetails,
  WorkspaceMembers,
  WorkspaceSetupInfo,
  WorkspaceTeamResponse,
  WorkspacesResponse,
  WorkspacePendingInvitations,
  PendingInvitesResponse,
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

export function getTeamMembers(workspaceId: string, teamId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacesTeamMembers(workspaceId, teamId).catch((error) => {
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
  details: { name: string; description: string },
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

export function deleteTeam(teamId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.deleteTeam({ teamId }).catch((error) => {
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

export function changeTeamManager(teamId: string): Promise<void> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.changeTeamManager(teamId).catch((error) => {
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
  teamId: string,
  orderBy?: OrderByOptions,
): [Promise<ListAllSharedFoldersResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFolders(workspaceId, teamId, orderBy);
}

export function getAllWorkspaceTeamSharedFiles(
  workspaceId: string,
  teamId: string,
  orderBy?: OrderByOptions,
): [Promise<ListAllSharedFoldersResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFiles(workspaceId, teamId, orderBy);
}

export function getAllWorkspaceTeamSharedFolderFolders(
  workspaceId: string,
  teamId: string,
  sharedFolderUUID: string,
  page: number,
  perPage: number,
  orderBy?: OrderByOptions,
): [Promise<ListWorkspaceSharedItemsResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFolderFolders(
    workspaceId,
    teamId,
    sharedFolderUUID,
    page,
    perPage,
    orderBy,
  );
}

export function getAllWorkspaceTeamSharedFolderFiles(
  workspaceId: string,
  teamId: string,
  sharedFolderUUID: string,
  page: number,
  perPage: number,
  orderBy?: OrderByOptions,
): [Promise<ListWorkspaceSharedItemsResponse>, RequestCanceler] {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFolderFiles(
    workspaceId,
    teamId,
    sharedFolderUUID,
    page,
    perPage,
    orderBy,
  );
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

const workspacesService = {
  getWorkspaces,
  getWorkspacesMembers,
  getWorkspaceTeams,
  getTeamMembers,
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
  getWorkspaceFolders,
  getWorkspaceFiles,
};

export default workspacesService;
