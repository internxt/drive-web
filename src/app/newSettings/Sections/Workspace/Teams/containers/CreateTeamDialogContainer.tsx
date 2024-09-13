import { useState } from 'react';
import { WorkspaceData, WorkspaceTeamResponse } from '@internxt/sdk/dist/workspaces/types';

import { t } from 'i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';

import CreateTeamDialog from '../components/CreateTeamDialog';

interface CreateTeamDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkspace: WorkspaceData | null;
  teams: WorkspaceTeamResponse;
  getTeams: () => Promise<void>;
  setIsCreateTeamDialogOpen: (boolean) => void;
}

const CreateTeamDialogContainer: React.FC<CreateTeamDialogContainerProps> = ({
  isOpen,
  onClose,
  selectedWorkspace,
  teams,
  getTeams,
  setIsCreateTeamDialogOpen,
}) => {
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [isCreateTeamLoading, setIsCreateTeamLoading] = useState<boolean>(false);

  const createTeam = async () => {
    setIsCreateTeamLoading(true);
    if (selectedWorkspace) {
      try {
        const nameExists = teams.some((team) => team.team.name === newTeamName);

        if (nameExists) {
          notificationsService.show({
            text: t('preferences.workspace.teams.createTeamDialog.nameExists'),
            type: ToastType.Error,
          });
          return;
        }

        await workspacesService.createTeam({
          workspaceId: selectedWorkspace.workspaceUser.workspaceId,
          name: newTeamName,
          managerId: selectedWorkspace.workspaceUser.memberId,
        });
        setTimeout(() => {
          getTeams();
        }, 500);
      } catch (err) {
        const castedError = errorService.castError(err);
        errorService.reportError(castedError);
      } finally {
        setIsCreateTeamLoading(false);
      }

      setIsCreateTeamLoading(false);
      setIsCreateTeamDialogOpen(false);
      setNewTeamName('');
    }
  };

  return (
    <CreateTeamDialog
      isOpen={isOpen}
      onClose={onClose}
      newTeamName={newTeamName}
      setNewTeamName={setNewTeamName}
      isCreateTeamLoading={isCreateTeamLoading}
      createTeam={createTeam}
    />
  );
};

export default CreateTeamDialogContainer;
