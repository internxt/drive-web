import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PendingWorkspace, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { workspaceThunks } from '../../../store/slices/workspaces/workspacesStore';
import WorkspaceSelector, { Workspace } from './WorkspaceSelector';

const WorkspaceSelectorContainer = ({ user }: { user: UserSettings | undefined }) => {
  const dispatch = useDispatch();
  const workspaces = useSelector((state: RootState) => state.workspaces.workspaces);
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const pendingWorkspaces = useSelector((state: RootState) => state.workspaces.pendingWorkspaces);
  const parsedWorkspaces = parseWorkspaces(workspaces);
  const parsedPendingWorkspaces = parsePendingWorkspaces(pendingWorkspaces);
  const allParsedWorkspaces = [...parsedWorkspaces, ...parsedPendingWorkspaces];

  const handleWorkspaceChange = (workspaceId: string | null) => {
    const selectedWorkspace = allParsedWorkspaces.find((workspace) => workspace.uuid === workspaceId);

    if (selectedWorkspace?.isPending) {
      const selectedPendingWorkspace = pendingWorkspaces.find((workspace) => workspace.id === selectedWorkspace.uuid);

      selectedPendingWorkspace &&
        dispatch(workspaceThunks.setupWorkspace({ pendingWorkspace: selectedPendingWorkspace }));
      return;
    }
    dispatch(workspaceThunks.setSelectedWorkspace({ workspaceId }));
  };

  if (!user) return null;

  const userWorkspace: Workspace = {
    name: user.name,
    type: 'Personal',
    uuid: user.uuid,
    avatar: user?.avatar,
  };

  return (
    <WorkspaceSelector
      userWorkspace={userWorkspace}
      workspaces={allParsedWorkspaces}
      onChangeWorkspace={handleWorkspaceChange}
      onCreateWorkspaceButtonClicked={() => undefined}
      selectedWorkspace={selectedWorkspace ? parseWorkspaces([selectedWorkspace])[0] : userWorkspace}
    />
  );
};

const parseWorkspaces = (workspaces: WorkspaceData[]): Workspace[] =>
  workspaces?.map((workspace) => {
    return {
      name: workspace.workspace.name,
      uuid: workspace.workspace.id,
      type: 'Business',
      avatar: null,
    };
  });

const parsePendingWorkspaces = (workspaces: PendingWorkspace[]): Workspace[] =>
  workspaces?.map((workspace) => {
    return {
      name: workspace.name,
      uuid: workspace.id,
      type: 'Business',
      isPending: true,
      avatar: null,
    };
  });

export default WorkspaceSelectorContainer;
