import { useState } from 'react';
import { TeamMember, WorkspaceTeam } from '@internxt/sdk/dist/workspaces/types';

import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';

import RemoveTeamMemberDialog from '../components/RemoveTeamMemberDialog';

interface RemoveTeamMemberDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  teamMemberToRemove: TeamMember | null;
  selectedTeam: WorkspaceTeam | null;
  getWorkspacesMembers: () => Promise<void>;
  getTeams: () => Promise<void>;
  getTeamMembers: (team: WorkspaceTeam) => Promise<void>;
  setIsRemoveTeamMemberDialogOpen: (isOpen: boolean) => void;
  setTeamMemberToRemove: (teamMember: TeamMember | null) => void;
}

const RemoveTeamMemberDialogContainer: React.FC<RemoveTeamMemberDialogContainerProps> = ({
  isOpen,
  onClose,
  teamMemberToRemove,
  selectedTeam,
  getWorkspacesMembers,
  getTeams,
  getTeamMembers,
  setIsRemoveTeamMemberDialogOpen,
  setTeamMemberToRemove,
}) => {
  const [isRemoveTeamMemberLoading, setIsRemoveTeamMemberLoading] = useState<boolean>(false);

  const removeTeamMember = async () => {
    setIsRemoveTeamMemberLoading(true);
    try {
      if (selectedTeam && teamMemberToRemove) {
        await workspacesService.removeTeamUser(selectedTeam.team.id, teamMemberToRemove?.uuid);
      }
      setTimeout(() => {
        getWorkspacesMembers();
        selectedTeam && getTeamMembers(selectedTeam);
        getTeams();
      }, 500);
    } catch (err) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
    }
    setIsRemoveTeamMemberLoading(false);
    setIsRemoveTeamMemberDialogOpen(false);
    setTeamMemberToRemove(null);
  };

  return (
    <RemoveTeamMemberDialog
      isOpen={isOpen}
      onClose={onClose}
      isRemoveTeamMemberLoading={isRemoveTeamMemberLoading}
      removeTeamMember={removeTeamMember}
      teamMemberToRemove={teamMemberToRemove}
    />
  );
};

export default RemoveTeamMemberDialogContainer;
