import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { workspaceThunks, workspacesActions } from '../../../store/slices/workspaces/workspacesStore';
import WorkspaceSelector, { Workspace } from './WorkspaceSelector';

const WorkspaceSelectorContainer = ({ user }: { user: UserSettings }) => {
  const dispatch = useDispatch();
  const workspaces = useSelector((state: RootState) => state.workspaces.workspaces);
  const parsedWorkspaces = parseWorkspaces(workspaces);

  useEffect(() => {
    dispatch(workspaceThunks.fetchWorkspaces());
  }, []);

  return (
    <WorkspaceSelector
      userWorkspace={{
        name: user.name,
        type: 'Personal',
        uuid: user.uuid,
        avatar: user?.avatar,
      }}
      workspaces={parsedWorkspaces}
      onChangeWorkspace={(workspaceId: string | null) => dispatch(workspacesActions.setSelectedWorkspace(workspaceId))}
      onCreateWorkspaceButtonClicked={() => undefined}
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

export default WorkspaceSelectorContainer;
