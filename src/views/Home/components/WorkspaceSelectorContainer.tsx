import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PendingWorkspace, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { planThunks } from 'app/store/slices/plan';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import PendingInvitationsDialog from './PendingInvitationsDialog';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import WorkspaceSelector, { Workspace } from './WorkspaceSelector';
import encryptedStorageService from 'services/encrypted-storage.service';

interface WorkspaceSelectorContainerProps {
  user: UserSettings | undefined;
  isCollapsed?: boolean;
}

const WorkspaceSelectorContainer = ({ user, isCollapsed }: WorkspaceSelectorContainerProps) => {
  const dispatch = useAppDispatch();
  const workspaces = useSelector((state: RootState) => state.workspaces.workspaces);
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const pendingWorkspaces = useSelector((state: RootState) => state.workspaces.pendingWorkspaces);
  const pendingWorkspacesInvites = useSelector((state: RootState) => state.workspaces.pendingWorkspacesInvites);
  const parsedWorkspaces = parseWorkspaces(workspaces);
  const parsedPendingWorkspaces = parsePendingWorkspaces(pendingWorkspaces);
  const allParsedWorkspaces = [...parsedWorkspaces, ...parsedPendingWorkspaces];
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWorkspaceSelectorOpen, setIsWorkspaceSelectorOpen] = useState<boolean>(false);

  useEffect(() => {
    (isDialogOpen || isWorkspaceSelectorOpen) && dispatch(workspaceThunks.fetchPendingWorkspacesInvites());
  }, [isLoading, isWorkspaceSelectorOpen]);

  const handleWorkspaceChange = (workspaceId: string | null) => {
    const selectedWorkspace = allParsedWorkspaces.find((workspace) => workspace.uuid === workspaceId);

    if (selectedWorkspace?.isPending) {
      const selectedPendingWorkspace = pendingWorkspaces.find((workspace) => workspace.id === selectedWorkspace.uuid);

      selectedPendingWorkspace &&
        dispatch(workspaceThunks.setupWorkspace({ pendingWorkspace: selectedPendingWorkspace }));
      return;
    }
    dispatch(workspaceThunks.setSelectedWorkspace({ workspaceId }));
    dispatch(planThunks.fetchBusinessLimitUsageThunk());
    encryptedStorageService.clearFolderToken();
    encryptedStorageService.clearFileToken();
  };

  if (!user) return null;

  const onCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const userWorkspace: Workspace = {
    name: user.name,
    type: 'Personal',
    uuid: user.uuid,
    avatar: user?.avatar,
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
        userWorkspace={userWorkspace}
        workspaces={allParsedWorkspaces}
        onChangeWorkspace={handleWorkspaceChange}
        selectedWorkspace={selectedWorkspace ? parseWorkspaces([selectedWorkspace])[0] : userWorkspace}
        pendingWorkspacesInvitesLength={pendingWorkspacesInvites.length}
        setIsDialogOpen={setIsDialogOpen}
        isWorkspaceSelectorOpen={isWorkspaceSelectorOpen}
        setIsWorkspaceSelectorOpen={setIsWorkspaceSelectorOpen}
        isCollapsed={isCollapsed}
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
      avatar: workspace.workspace.avatar,
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
