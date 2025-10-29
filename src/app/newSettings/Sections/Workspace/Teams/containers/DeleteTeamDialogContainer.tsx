import { useState } from 'react';
import { WorkspaceData, WorkspaceTeam } from '@internxt/sdk/dist/workspaces/types';

import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';

import DeleteTeamDialog from '../components/DeleteTeamDialog';

interface DeleteTeamDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkspace: WorkspaceData | null;
  selectedTeam: WorkspaceTeam | null;
  setSelectedTeam: (team: WorkspaceTeam | null) => void;
  setIsDeleteTeamDialogOpen: (boolean) => void;
  getTeams: () => Promise<void>;
}

const DeleteTeamDialogContainer: React.FC<DeleteTeamDialogContainerProps> = ({
  isOpen,
  onClose,
  selectedWorkspace,
  selectedTeam,
  setSelectedTeam,
  setIsDeleteTeamDialogOpen,
  getTeams,
}) => {
  const [isDeleteTeamLoading, setIsDeleteTeamLoading] = useState<boolean>(false);

  const deleteTeam = async () => {
    setIsDeleteTeamLoading(true);
    try {
      if (selectedWorkspace && selectedTeam) {
        await workspacesService.deleteTeam(selectedWorkspace.workspaceUser.workspaceId, selectedTeam.team.id);
      }
      setSelectedTeam(null);
      setIsDeleteTeamDialogOpen(false);
      setTimeout(() => {
        getTeams();
      }, 500);
    } catch (err) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
    }
    setIsDeleteTeamLoading(false);
  };

  return (
    <DeleteTeamDialog
      isOpen={isOpen}
      onClose={onClose}
      isDeleteTeamLoading={isDeleteTeamLoading}
      deleteTeam={deleteTeam}
      selectedTeam={selectedTeam}
    />
  );
};

export default DeleteTeamDialogContainer;
