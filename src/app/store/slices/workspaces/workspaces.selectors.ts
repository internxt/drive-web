import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { RootState } from '../..';

const workspacesSelectors = {
  getSelectedWorkspace(state: RootState): WorkspaceData | null {
    const { selectedWorkspace } = state.workspaces;
    return selectedWorkspace;
  },
  getWorkspaceCredentials(state: RootState): WorkspaceCredentialsDetails | null {
    const { workspaceCredentials } = state.workspaces;
    return workspaceCredentials;
  },
};

export default workspacesSelectors;
