import { useEffect, useState } from 'react';
import { t } from 'i18next';
import { WorkspaceTeamResponse, WorkspaceTeam, TeamMembers } from '@internxt/sdk/dist/workspaces/types';

import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

import Section from 'app/newSettings/components/Section';
import TeamsList from './components/TeamsList';
import CreateTeamDialog from './components/CreateTeamDialog';
import TeamDetails from './components/TeamDetails';

const TeamsSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const isCurrentUserWorkspaceOwner = useAppSelector(workspacesSelectors.isWorkspaceOwner);

  const [teams, setTeams] = useState<WorkspaceTeamResponse>([]);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<WorkspaceTeam | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMembers>([]);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [isMemberOptionsOpen, setIsMemberOptionsOpen] = useState<boolean>(false);
  const [isTeamOptionsOpen, setIsTeamOptionsOpen] = useState<boolean>(false);

  useEffect(() => {
    getTeams();
  }, []);

  const getTeams = async () => {
    if (selectedWorkspace) {
      try {
        const teams = await workspacesService.getWorkspaceTeams(selectedWorkspace.workspaceUser.workspaceId);
        setTeams(teams);
      } catch (err) {
        const castedError = errorService.castError(err);
        errorService.reportError(castedError);
        notificationsService.show({
          text: castedError.message,
          type: ToastType.Error,
        });
      }
    }
  };

  const getTeamMembers = async (teamId) => {
    try {
      const teamMembers = await workspacesService.getTeamMembers(teamId);
      setSelectedTeamMembers(teamMembers);
    } catch (err) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
      notificationsService.show({
        text: castedError.message,
        type: ToastType.Error,
      });
    }
  };

  const createTeam = async () => {
    setIsLoading(true);
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
        getTeams();
      } catch (err) {
        const castedError = errorService.castError(err);
        errorService.reportError(castedError);
        notificationsService.show({
          text: castedError.message,
          type: ToastType.Error,
        });
      } finally {
        setIsLoading(false);
      }

      setIsLoading(false);
      setCreateTeamDialogOpen(false);
      setNewTeamName('');
    }
  };

  const handleMemberHover = (memberUuid) => {
    setHoveredMember(memberUuid);
  };

  const handleMemberLeave = () => {
    setHoveredMember(null);
  };

  return (
    <Section
      title={selectedTeam ? selectedTeam.team.name : t('preferences.workspace.teams.title')}
      onBackButtonClicked={selectedTeam ? () => setSelectedTeam(null) : undefined}
      onClosePreferences={onClosePreferences}
    >
      {selectedTeam ? (
        <TeamDetails
          team={selectedTeam}
          selectedTeamMembers={selectedTeamMembers}
          handleMemberHover={handleMemberHover}
          handleMemberLeave={handleMemberLeave}
          hoveredMember={hoveredMember}
          setIsMemberOptionsOpen={setIsMemberOptionsOpen}
          isMemberOptionsOpen={isMemberOptionsOpen}
          isTeamOptionsOpen={isTeamOptionsOpen}
          setIsTeamOptionsOpen={setIsTeamOptionsOpen}
        />
      ) : (
        <TeamsList
          setCreateTeamDialogOpen={setCreateTeamDialogOpen}
          teams={teams}
          isCurrentUserWorkspaceOwner={isCurrentUserWorkspaceOwner}
          setSelectedTeam={setSelectedTeam}
          getTeamMembers={getTeamMembers}
        />
      )}
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
