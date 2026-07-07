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
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'services/error.service';
import transformItemService from 'app/drive/services/item-transform.service';

export async function getWorkspaces(): Promise<WorkspacesResponse> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaces().catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getWorkspacesMembers(workspaceId: string): Promise<WorkspaceMembers> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacesMembers(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getWorkspaceTeams(workspaceId: string): Promise<WorkspaceTeamResponse> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacesTeams(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getTeamMembers(teamId: string): Promise<TeamMembers> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacesTeamMembers(teamId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getMemberDetails(workspaceId: string, memberId: string): Promise<GetMemberDetailsResponse> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getMemberDetails(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function inviteUserToTeam(inviteUserBody: InviteMemberBody): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
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

export async function acceptWorkspaceInvite({
  invitationId,
  token,
}: {
  invitationId: string;
  token: string;
}): Promise<void> {
  const shareClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return shareClient.acceptInvitation(invitationId, token).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function declineWorkspaceInvite({
  invitationId,
  token,
}: {
  invitationId: string;
  token: string;
}): Promise<void> {
  const shareClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return shareClient.declineInvitation(invitationId, token).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function setupWorkspace(workspaceSetupInfo: WorkspaceSetupInfo): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.setupWorkspace(workspaceSetupInfo).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function editWorkspace(
  workspaceId: string,
  details: { name?: string; description?: string; address?: string },
): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.editWorkspace(workspaceId, details).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function updateWorkspaceAvatar(workspaceId: string, avatar: Blob): Promise<{ avatar: string }> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.updateAvatar(workspaceId, { avatar }).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function deleteWorkspaceAvatar(workspaceId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.deleteAvatar(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function createTeam(createTeamData: CreateTeamData): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.createTeam(createTeamData).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function editTeam(teamId: string, name: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.editTeam({ teamId, name }).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function deleteTeam(workspaceId: string, teamId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.deleteTeam({ workspaceId, teamId }).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function addTeamUser(teamId: string, userUuid: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.addTeamUser(teamId, userUuid).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function removeTeamUser(teamId: string, userUuid: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.removeTeamUser(teamId, userUuid).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function changeTeamManager(workspaceId: string, teamId: string, userId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.changeTeamManager(workspaceId, teamId, userId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function createFileEntry(
  fileEntry: FileEntry,
  workspaceId: string,
  resourcesToken?: string,
): Promise<DriveFileData> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.createFileEntry(fileEntry, workspaceId, resourcesToken).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function createFolder(
  payload: CreateFolderPayload,
): Promise<[Promise<CreateFolderResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.createFolder(payload);
}

export async function getWorkspaceCredentials(workspaceId: string): Promise<WorkspaceCredentialsDetails> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceCredentials(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getWorkspacePendingInvitations(
  workspaceId: string,
  limit: number,
  offset: number,
): Promise<WorkspacePendingInvitations[]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspacePendingInvitations(workspaceId, limit, offset).catch((error) => {
    throw errorService.castError(error);
  });
}
export async function getTrashItems(
  workspaceId: string,
  type: 'file' | 'folder',
  offset,
): Promise<FetchTrashContentResponse> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getPersonalTrash(workspaceId, type, offset).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function validateWorkspaceInvitation(inviteId: string): Promise<{ uuid: string }> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.validateWorkspaceInvitation(inviteId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getPendingInvites(): Promise<PendingInvitesResponse> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getPendingInvites().catch((error) => {
    throw errorService.castError(error);
  });
}
export async function emptyTrash(workspaceId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.emptyPersonalTrash(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function shareItemWithTeam(shareItemWithTeamPayload: CreateWorkspaceSharingPayload): Promise<SharingMeta> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.shareItem(shareItemWithTeamPayload).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getAllWorkspaceTeamSharedFolders(
  workspaceId: string,
  orderBy?: OrderByOptions,
): Promise<[Promise<ListAllSharedFoldersResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFoldersV2(workspaceId, orderBy);
}

export async function getAllWorkspaceTeamSharedFiles(
  workspaceId: string,
  orderBy?: OrderByOptions,
): Promise<[Promise<ListAllSharedFoldersResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFilesV2(workspaceId, orderBy);
}

export async function getAllWorkspaceTeamSharedFolderFolders(
  workspaceId: string,
  sharedFolderUUID: string,
  page: number,
  perPage: number,
  token?: string,
  orderBy?: OrderByOptions,
): Promise<[Promise<ListWorkspaceSharedItemsResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFolderFoldersV2(
    workspaceId,
    sharedFolderUUID,
    page,
    perPage,
    token,
    orderBy,
  );
}

export async function getAllWorkspaceTeamSharedFolderFiles(
  workspaceId: string,
  sharedFolderUUID: string,
  page: number,
  perPage: number,
  token?: string,
  orderBy?: OrderByOptions,
): Promise<[Promise<ListWorkspaceSharedItemsResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaceTeamSharedFolderFilesV2(
    workspaceId,
    sharedFolderUUID,
    page,
    perPage,
    token,
    orderBy,
  );
}

export async function getUsersAndTeamsAnItemIsShareWidth({
  workspaceId,
  itemType,
  itemId,
}: {
  workspaceId: string;
  itemId: string;
  itemType: 'folder' | 'file';
}): Promise<[Promise<UsersAndTeamsAnItemIsShareWidthResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getUsersAndTeamsAnItemIsShareWidth({ workspaceId, itemType, itemId });
}

export async function getWorkspaceFolders(
  workspaceId: string,
  folderId: string,
  offset: number,
  limit: number,
): Promise<[Promise<FetchPaginatedFolderContentResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  const folders = workspaceClient.getFolders(workspaceId, folderId, offset, limit, 'plainName', 'ASC');

  return folders;
}
export async function getWorkspaceFiles(
  workspaceId: string,
  folderId: string,
  offset: number,
  limit: number,
): Promise<[Promise<FetchPaginatedFolderContentResponse>, RequestCanceler]> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  const [responsePromise, requestCanceller] = workspaceClient.getFiles(
    workspaceId,
    folderId,
    offset,
    limit,
    'plainName',
    'ASC',
  );

  const transformedPromise = responsePromise.then((response) => ({
    ...response,
    result: response.result.map((folder) => ({
      ...folder,
      files: transformItemService.mapFileSizeToNumber(folder.files),
    })),
  }));

  return [transformedPromise, requestCanceller];
}

export async function deactivateMember(workspaceId: string, memberId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.deactivateMember(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function reactivateMember(workspaceId: string, memberId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.activateMember(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function removeMember(workspaceId: string, memberId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.removeMember(workspaceId, memberId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function getUsage(workspaceId: string): Promise<GetMemberUsageResponse> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getMemberUsage(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}
export async function modifyMemberUsage(
  workspaceId: string,
  memberId: string,
  spaceLimitBytes: number,
): Promise<WorkspaceUser> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.modifyMemberUsage(workspaceId, memberId, spaceLimitBytes);
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspace(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export async function leaveWorkspace(workspaceId: string): Promise<void> {
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.leaveWorkspace(workspaceId).catch((error) => {
    throw errorService.castError(error);
  });
}

export const getWorkspaceLogs = async ({
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
  const workspaceClient = await SdkFactory.getNewApiInstance().createWorkspacesClient();
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
