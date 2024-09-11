import { useEffect, useState } from 'react';
import { t } from 'i18next';
import {
  WorkspaceTeamResponse,
  WorkspaceTeam,
  TeamMembers,
  WorkspaceUser,
  TeamMember,
} from '@internxt/sdk/dist/workspaces/types';

import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';

import Section from 'app/newSettings/components/Section';
import TeamsList from './components/TeamsList';
import AddMemberDialogContainer from './containers/AddMemberDialogContainer';
import CreateTeamDialogContainer from './containers/CreateTeamDialogContainer';
import RenameTeamDialogContainer from './containers/RenameTeamDialogContainer';
import DeleteTeamDialogContainer from './containers/DeleteTeamDialogContainer';
import RemoveTeamMemberDialogContainer from './containers/RemoveTeamMemberDialogContainer';
import ChangeManagerDialogContainer from './containers/ChangeManagerDialogContainer';
import TeamDetailsContainer from './containers/TeamDetailsContainer';

const TeamsSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const isCurrentUserWorkspaceOwner = useAppSelector(workspacesSelectors.isWorkspaceOwner);
  const user = useAppSelector((state) => state.user.user);

  const [teams, setTeams] = useState<WorkspaceTeamResponse>([]);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState<boolean>(false);
  const [isRenameTeamDialogOpen, setIsRenameTeamDialogOpen] = useState<boolean>(false);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState<boolean>(false);
  const [isRemoveTeamMemberDialogOpen, setIsRemoveTeamMemberDialogOpen] = useState<boolean>(false);
  const [isChangeManagerDialogOpen, setIsChangeManagerDialogOpen] = useState<boolean>(false);
  const [isGetTeamsLoading, setIsGetTeamsLoading] = useState<boolean>(false);
  const [isGetTeamMembersLoading, setIsGetTeamMembersLoading] = useState<boolean>(false);
  const [isGetWorkspacesMembersLoading, setIsGetWorkspacesMembersLoading] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<WorkspaceTeam | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMembers>([]);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState<boolean>(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceUser[] | null>(null);
  const [displayedMembers, setDisplayedMembers] = useState(workspaceMembers);
  const [teamMemberToRemove, setTeamMemberToRemove] = useState<TeamMember | null>(null);
  const [newTeamManager, setNewTeamManager] = useState<TeamMember | null>(null);
  const [currentTeamManager, setCurrentTeamManager] = useState<TeamMember | null>(null);
  const [isCurrentUserManager, setIsCurrentUserManager] = useState<boolean>(false);

  useEffect(() => {
    getTeams();
  }, [selectedWorkspace]);

  const getTeams = async () => {
    if (selectedWorkspace) {
      setIsGetTeamsLoading(true);
      try {
        const teams = await workspacesService.getWorkspaceTeams(selectedWorkspace.workspaceUser.workspaceId);
        teams.sort((a, b) => a.team.name.localeCompare(b.team.name));
        setTeams(teams);
        if ((selectedTeam && isRenameTeamDialogOpen) || (selectedTeam && isChangeManagerDialogOpen)) {
          const team = teams.find((team) => team.team.id === selectedTeam?.team.id);
          team && setSelectedTeam(team);
        }
      } catch (err) {
        const castedError = errorService.castError(err);
        errorService.reportError(castedError);
      }
      setIsGetTeamsLoading(false);
    }
  };

  const getTeamMembers = async (team: WorkspaceTeam) => {
    setIsGetTeamMembersLoading(true);
    try {
      const teamMembers = await workspacesService.getTeamMembers(team.team.id);
      user && user.uuid === team.team.managerId ? setIsCurrentUserManager(true) : setIsCurrentUserManager(false);
      setSelectedTeamMembers(teamMembers);
    } catch (err) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
    }
    setIsGetTeamMembersLoading(false);
  };

  const getWorkspacesMembers = async () => {
    if (selectedWorkspace) {
      setIsGetWorkspacesMembersLoading(true);
      try {
        const members = await workspacesService.getWorkspacesMembers(selectedWorkspace.workspaceUser.workspaceId);
        const activatedMembers = [...members.activatedUsers];
        const nonTeamWorkspaceMembembers = activatedMembers.filter(
          (member) => !selectedTeamMembers.some((teamMember) => teamMember.uuid === member.member.uuid),
        );
        setWorkspaceMembers(nonTeamWorkspaceMembembers);
        setDisplayedMembers(nonTeamWorkspaceMembembers);
      } catch (err) {
        const castedError = errorService.castError(err);
        errorService.reportError(castedError);
      }
      setIsGetWorkspacesMembersLoading(false);
    }
  };

  const handleChangeManagerClicked = (member: TeamMember) => {
    setNewTeamManager(member);
    selectedTeamMembers.map((member) => member.uuid === selectedTeam?.team.managerId && setCurrentTeamManager(member));
    setIsChangeManagerDialogOpen(true);
  };

  return (
    <Section
      title={selectedTeam ? selectedTeam.team.name : t('preferences.workspace.teams.title')}
      onBackButtonClicked={
        selectedTeam
          ? () => {
              setSelectedTeam(null);
              setIsCurrentUserManager(false);
            }
          : undefined
      }
      onClosePreferences={onClosePreferences}
    >
      {selectedTeam ? (
        <TeamDetailsContainer
          team={selectedTeam}
          selectedTeamMembers={selectedTeamMembers}
          setIsAddMemberDialogOpen={setIsAddMemberDialogOpen}
          getWorkspacesMembers={getWorkspacesMembers}
          isGetTeamMembersLoading={isGetTeamMembersLoading}
          isCurrentUserWorkspaceOwner={isCurrentUserWorkspaceOwner}
          setIsRenameTeamDialogOpen={setIsRenameTeamDialogOpen}
          setIsDeleteTeamDialogOpen={setIsDeleteTeamDialogOpen}
          setIsRemoveTeamMemberDialogOpen={setIsRemoveTeamMemberDialogOpen}
          setTeamMemberToRemove={setTeamMemberToRemove}
          handleChangeManagerClicked={handleChangeManagerClicked}
          selectedWorkspace={selectedWorkspace}
          isCurrentUserManager={isCurrentUserManager}
        />
      ) : (
        <TeamsList
          setIsCreateTeamDialogOpen={setIsCreateTeamDialogOpen}
          teams={teams}
          isCurrentUserWorkspaceOwner={isCurrentUserWorkspaceOwner}
          setSelectedTeam={setSelectedTeam}
          getTeamMembers={getTeamMembers}
          isGetTeamsLoading={isGetTeamsLoading}
        />
      )}
      <CreateTeamDialogContainer
        isOpen={isCreateTeamDialogOpen}
        onClose={() => setIsCreateTeamDialogOpen(false)}
        selectedWorkspace={selectedWorkspace}
        teams={teams}
        getTeams={getTeams}
        setIsCreateTeamDialogOpen={setIsCreateTeamDialogOpen}
      />
      <AddMemberDialogContainer
        isOpen={isAddMemberDialogOpen}
        onClose={() => setIsAddMemberDialogOpen(false)}
        workspaceMembers={workspaceMembers}
        displayedMembers={displayedMembers}
        setDisplayedMembers={setDisplayedMembers}
        isGetWorkspacesMembersLoading={isGetWorkspacesMembersLoading}
        selectedTeam={selectedTeam}
        setIsAddMemberDialogOpen={setIsAddMemberDialogOpen}
        getWorkspacesMembers={getWorkspacesMembers}
        getTeamMembers={getTeamMembers}
        getTeams={getTeams}
      />
      <RenameTeamDialogContainer
        isOpen={isRenameTeamDialogOpen}
        onClose={() => setIsRenameTeamDialogOpen(false)}
        selectedWorkspace={selectedWorkspace}
        teams={teams}
        selectedTeam={selectedTeam}
        setIsRenameTeamDialogOpen={setIsRenameTeamDialogOpen}
        getTeams={getTeams}
      />
      <DeleteTeamDialogContainer
        isOpen={isDeleteTeamDialogOpen}
        onClose={() => setIsDeleteTeamDialogOpen(false)}
        selectedWorkspace={selectedWorkspace}
        selectedTeam={selectedTeam}
        setSelectedTeam={setSelectedTeam}
        setIsDeleteTeamDialogOpen={setIsDeleteTeamDialogOpen}
        getTeams={getTeams}
      />
      <RemoveTeamMemberDialogContainer
        isOpen={isRemoveTeamMemberDialogOpen}
        onClose={() => setIsRemoveTeamMemberDialogOpen(false)}
        teamMemberToRemove={teamMemberToRemove}
        selectedTeam={selectedTeam}
        getWorkspacesMembers={getWorkspacesMembers}
        getTeams={getTeams}
        getTeamMembers={getTeamMembers}
        setIsRemoveTeamMemberDialogOpen={setIsRemoveTeamMemberDialogOpen}
        setTeamMemberToRemove={setTeamMemberToRemove}
      />
      <ChangeManagerDialogContainer
        isOpen={isChangeManagerDialogOpen}
        onClose={() => setIsChangeManagerDialogOpen(false)}
        newTeamManager={newTeamManager}
        currentTeamManager={currentTeamManager}
        selectedWorkspace={selectedWorkspace}
        selectedTeam={selectedTeam}
        getTeams={getTeams}
        getWorkspacesMembers={getWorkspacesMembers}
        getTeamMembers={getTeamMembers}
        setIsChangeManagerDialogOpen={setIsChangeManagerDialogOpen}
      />
    </Section>
  );
};

export default TeamsSection;
