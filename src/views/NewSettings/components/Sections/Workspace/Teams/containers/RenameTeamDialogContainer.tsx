import { useState } from 'react';

import { WorkspaceData, WorkspaceTeam, WorkspaceTeamResponse } from '@internxt/sdk/dist/workspaces/types';

import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';

import RenameTeamDialog from '../components/RenameTeamDialog';

interface RenameTeamDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkspace: WorkspaceData | null;
  teams: WorkspaceTeamResponse;
  selectedTeam: WorkspaceTeam | null;
  setIsRenameTeamDialogOpen: (boolean) => void;
  getTeams: () => Promise<void>;
}

const RenameTeamDialogContainer: React.FC<RenameTeamDialogContainerProps> = ({
  isOpen,
  onClose,
  selectedWorkspace,
  teams,
  selectedTeam,
  setIsRenameTeamDialogOpen,
  getTeams,
}) => {
  const [renameTeamName, setRenameTeamName] = useState<string>('');
  const [isRenameTeamLoading, setIsRenameTeamLoading] = useState<boolean>(false);

  const renameTeam = async () => {
    setIsRenameTeamLoading(true);
    if (selectedWorkspace) {
      try {
        const nameExists = teams.some((team) => team.team.name === renameTeamName);

        if (nameExists) {
          notificationsService.show({
            text: t('preferences.workspace.teams.createTeamDialog.nameExists'),
            type: ToastType.Error,
          });
          return;
        }
        selectedTeam && (await workspacesService.editTeam(selectedTeam.team.id, renameTeamName));
        setTimeout(() => {
          getTeams();
        }, 500);
      } catch (err) {
        const castedError = errorService.castError(err);
        errorService.reportError(castedError);
      } finally {
        setIsRenameTeamLoading(false);
      }
      setIsRenameTeamLoading(false);
      setIsRenameTeamDialogOpen(false);
      setRenameTeamName('');
    }
  };
  return (
    <RenameTeamDialog
      isOpen={isOpen}
      onClose={onClose}
      renameTeamName={renameTeamName}
      setRenameTeamName={setRenameTeamName}
      isRenameTeamLoading={isRenameTeamLoading}
      renameTeam={renameTeam}
    />
  );
};

export default RenameTeamDialogContainer;
