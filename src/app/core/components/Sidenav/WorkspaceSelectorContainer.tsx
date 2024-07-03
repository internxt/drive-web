import { useEffect, useState } from 'react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PendingWorkspace, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { workspaceThunks } from '../../../store/slices/workspaces/workspacesStore';
import WorkspaceSelector, { Workspace } from './WorkspaceSelector';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';
import { PendingInvitesResponse } from '@internxt/sdk/dist/workspaces';
import PendingInvitationsDialog from 'app/core/components/Sidenav/PendingInvitationsDialog';

const WorkspaceSelectorContainer = ({ user }: { user: UserSettings | undefined }) => {
  const dispatch = useDispatch();
  const workspaces = useSelector((state: RootState) => state.workspaces.workspaces);
  const selectedWorkpace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const pendingWorkspaces = useSelector((state: RootState) => state.workspaces.pendingWorkspaces);
  const parsedWorkspaces = parseWorkspaces(workspaces);
  const parsedPendingWorksapces = parsePendingWorkspaces(pendingWorkspaces);
  const allParsedWorkspaces = [...parsedWorkspaces, ...parsedPendingWorksapces];
  const [pendingWorkspacesInvites, setPendingWorkspacesInvites] = useState<PendingInvitesResponse>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWorkspaceSelectorOpen, setIsWorkspaceSelectorOpen] = useState<boolean>(false);

  useEffect(() => {
    (isDialogOpen || isWorkspaceSelectorOpen) && getPendingInvites();
  }, [isLoading, isWorkspaceSelectorOpen]);

  const getPendingInvites = async () => {
    try {
      const pendingWorkspacesInvites = await workspacesService.getPendingInvites();
      setPendingWorkspacesInvites(pendingWorkspacesInvites);
    } catch (error) {
      errorService.reportError(error);
    }
  };

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

  const onCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <PendingInvitationsDialog
        pendingWorkspacesInvites={pendingWorkspacesInvites}
        isDialogOpen={isDialogOpen}
        onCloseDialog={onCloseDialog}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
      <WorkspaceSelector
        userWorkspace={{
          name: user.name,
          type: 'Personal',
          uuid: user.uuid,
          avatar: user?.avatar,
        }}
        workspaces={allParsedWorkspaces}
        onChangeWorkspace={handleWorkspaceChange}
        onCreateWorkspaceButtonClicked={() => undefined}
        selectedWorkspace={selectedWorkpace ? parseWorkspaces([selectedWorkpace])[0] : null}
        pendingWorkspacesInvitesLength={pendingWorkspacesInvites.length}
        setIsDialogOpen={setIsDialogOpen}
        isWorkspaceSelectorOpen={isWorkspaceSelectorOpen}
        setIsWorkspaceSelectorOpen={setIsWorkspaceSelectorOpen}
      />
    </>
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
