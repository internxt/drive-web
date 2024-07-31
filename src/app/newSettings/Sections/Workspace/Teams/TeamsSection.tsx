import { useState } from 'react';
import { t } from 'i18next';

import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';

import Section from 'app/newSettings/components/Section';
import TeamsList from './components/TeamsList';
import CreateTeamDialog from './components/CreateTeamDialog';

const TeamsSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createTeam = async () => {
    setIsLoading(true);
    if (selectedWorkspace) {
      try {
        await workspacesService.createTeam({
          workspaceId: selectedWorkspace.workspaceUser.workspaceId,
          name: newTeamName,
          managerId: selectedWorkspace.workspaceUser.memberId,
        });
      } catch (err) {
        const error = errorService.castError(err);
        errorService.reportError(error);
      } finally {
        setIsLoading(false);
        setCreateTeamDialogOpen(false);
        setNewTeamName('');
      }
    }
  };

  return (
    <Section title={t('preferences.workspace.teams.title')} onClosePreferences={onClosePreferences}>
      <TeamsList setCreateTeamDialogOpen={setCreateTeamDialogOpen} />
      <CreateTeamDialog
        isOpen={createTeamDialogOpen}
        onClose={() => setCreateTeamDialogOpen(false)}
        newTeamName={newTeamName}
        setNewTeamName={setNewTeamName}
        isLoading={isLoading}
        createTeam={createTeam}
      />
    </Section>
  );
};

export default TeamsSection;
