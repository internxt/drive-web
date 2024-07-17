import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { RootState } from '../..';

const workspacesSelectors = {
  isWorkspaceOwner(state: RootState): boolean {
    const userUuid = state.user.user?.uuid;
    const { selectedWorkspace } = state.workspaces;
    const workspaceOwnerUUID = selectedWorkspace?.workspace?.ownerId;

    return userUuid === workspaceOwnerUUID;
  },
  getSelectedWorkspace(state: RootState): WorkspaceData | null {
    const { selectedWorkspace } = state.workspaces;
    return selectedWorkspace;
  },
  getWorkspaceCredentials(state: RootState): WorkspaceCredentialsDetails | null {
    const { workspaceCredentials } = state.workspaces;
    return workspaceCredentials;
  },
  getFirstWorkspace(state: RootState): WorkspaceData | null {
    return state.workspaces.workspaces[0];
  },
};

export default workspacesSelectors;
