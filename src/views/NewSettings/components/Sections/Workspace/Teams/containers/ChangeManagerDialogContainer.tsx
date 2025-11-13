import { useState } from 'react';
import { TeamMember, WorkspaceData, WorkspaceTeam } from '@internxt/sdk/dist/workspaces/types';

import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';

import ChangeManagerDialog from '../components/ChangeManagerDialog';

interface ChangeManagerDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  newTeamManager: TeamMember | null;
  currentTeamManager: TeamMember | null;
  selectedWorkspace: WorkspaceData | null;
  selectedTeam: WorkspaceTeam | null;
  getTeams: () => Promise<void>;
  getWorkspacesMembers: () => Promise<void>;
  getTeamMembers: (team: WorkspaceTeam) => Promise<void>;
  setIsChangeManagerDialogOpen: (isOpen: boolean) => void;
}

const ChangeManagerDialogContainer: React.FC<ChangeManagerDialogContainerProps> = ({
  isOpen,
  onClose,
  newTeamManager,
  currentTeamManager,
  selectedWorkspace,
  selectedTeam,
  getTeams,
  getWorkspacesMembers,
  getTeamMembers,
  setIsChangeManagerDialogOpen,
}) => {
  const [isChangeManagerLoading, setIsChangeManagerLoading] = useState<boolean>(false);

  const changeManager = async () => {
    setIsChangeManagerLoading(true);
    try {
      if (selectedWorkspace && selectedTeam && newTeamManager) {
        await workspacesService.changeTeamManager(
          selectedWorkspace.workspaceUser.workspaceId,
          selectedTeam.team.id,
          newTeamManager.uuid,
        );
      }
      setTimeout(() => {
        getTeams();
        getWorkspacesMembers();
        selectedTeam && getTeamMembers(selectedTeam);
      }, 500);
    } catch (err) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
    }
    setIsChangeManagerLoading(false);
    setIsChangeManagerDialogOpen(false);
  };

  return (
    <ChangeManagerDialog
      isOpen={isOpen}
      onClose={onClose}
      isChangeManagerLoading={isChangeManagerLoading}
      changeManager={changeManager}
      newTeamManager={newTeamManager}
      currentTeamManager={currentTeamManager}
    />
  );
};

export default ChangeManagerDialogContainer;
