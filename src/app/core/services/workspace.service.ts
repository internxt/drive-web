import {
  CreateTeamData,
  InviteMemberBody,
  WorkspaceSetupInfo,
  WorkspaceTeamResponse,
  WorkspacesResponse,
} from '@internxt/sdk/dist/workspaces';
import { SdkFactory } from '../../core/factory/sdk';
import errorService from '../../core/services/error.service';

export function getWorkspaces(): Promise<WorkspacesResponse> {
  const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
  return workspaceClient.getWorkspaces().catch((error) => {
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

const workspacesService = {
  getWorkspaces,
  getWorkspaceTeams,
  getTeamMembers,
  inviteUserToTeam,
  setupWorkspace,
  createTeam,
  editTeam,
  deleteTeam,
  addTeamUser,
  removeTeamUser,
  changeTeamManager,
  changeUserRole,
  processInvitation,
};

export default workspacesService;
