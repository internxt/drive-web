import { PendingWorkspace, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { Workspace } from 'views/Home/components/WorkspaceSelector';

export const parseWorkspaces = (workspaces: WorkspaceData[]): Workspace[] =>
  workspaces?.map((workspace) => {
    return {
      name: workspace.workspace.name,
      uuid: workspace.workspace.id,
      type: 'Business',
      avatar: workspace.workspace.avatar,
    };
  });

export const parsePendingWorkspaces = (workspaces: PendingWorkspace[]): Workspace[] =>
  workspaces?.map((workspace) => {
    return {
      name: workspace.name,
      uuid: workspace.id,
      type: 'Business',
      isPending: true,
      avatar: null,
    };
  });
