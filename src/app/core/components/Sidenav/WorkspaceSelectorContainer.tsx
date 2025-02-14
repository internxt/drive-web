import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PendingInvitesResponse, PendingWorkspace, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { planThunks } from 'app/store/slices/plan';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PendingInvitationsDialog from '../../../core/components/Sidenav/PendingInvitationsDialog';
import errorService from '../../../core/services/error.service';
import workspacesService from '../../../core/services/workspace.service';
import { RootState } from '../../../store';
import { workspaceThunks } from '../../../store/slices/workspaces/workspacesStore';
import WorkspaceSelector, { Workspace } from './WorkspaceSelector';
import localStorageService, { STORAGE_KEYS } from '../../../core/services/local-storage.service';

const WorkspaceSelectorContainer = ({ user }: { user: UserSettings | undefined }) => {
  const dispatch = useDispatch();
  const workspaces = useSelector((state: RootState) => state.workspaces.workspaces);
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const pendingWorkspaces = useSelector((state: RootState) => state.workspaces.pendingWorkspaces);
  const parsedWorkspaces = parseWorkspaces(workspaces);
  const parsedPendingWorkspaces = parsePendingWorkspaces(pendingWorkspaces);
  const allParsedWorkspaces = [...parsedWorkspaces, ...parsedPendingWorkspaces];
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
    dispatch(planThunks.fetchBusinessLimitUsageThunk());
    localStorageService.set(STORAGE_KEYS.FOLDER_ACCESS_TOKEN, '');
    localStorageService.set(STORAGE_KEYS.FILE_ACCESS_TOKEN, '');
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
        onCreateWorkspaceButtonClicked={() => undefined}
        selectedWorkspace={selectedWorkspace ? parseWorkspaces([selectedWorkspace])[0] : userWorkspace}
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
