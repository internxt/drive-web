import { useEffect, useState } from 'react';
import { t } from 'i18next';
import { WorkspaceTeamResponse, WorkspaceTeam, TeamMembers, WorkspaceUser } from '@internxt/sdk/dist/workspaces/types';

import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { searchMembers, searchMembersEmail } from '../../../../newSettings/utils/membersUtils';

import Section from 'app/newSettings/components/Section';
import TeamsList from './components/TeamsList';
import CreateTeamDialog from './components/CreateTeamDialog';
import TeamDetails from './components/TeamDetails';
import AddMemberDialog from './components/AddMemberDialog';
import RenameTeamDialog from './components/RenameTeamDialog';

const TeamsSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const isCurrentUserWorkspaceOwner = useAppSelector(workspacesSelectors.isWorkspaceOwner);

  const [teams, setTeams] = useState<WorkspaceTeamResponse>([]);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState<boolean>(false);
  const [isRenameTeamDialogOpen, setIsRenameTeamDialogOpen] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [renameTeamName, setRenameTeamName] = useState<string>('');
  const [isCreateTeamLoading, setIsCreateTeamLoading] = useState<boolean>(false);
  const [isRenameTeamLoading, setIsRenameTeamLoading] = useState<boolean>(false);
  const [isGetTeamsLoading, setIsGetTeamsLoading] = useState<boolean>(false);
  const [isGetTeamMembersLoading, setIsGetTeamMembersLoading] = useState<boolean>(false);
  const [isGetWorkspacesMembersLoading, setIsGetWorkspacesMembersLoading] = useState<boolean>(false);
  const [isAddMembersLoading, setIsAddMembersLoading] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<WorkspaceTeam | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMembers>([]);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [isMemberOptionsOpen, setIsMemberOptionsOpen] = useState<boolean>(false);
  const [isTeamOptionsOpen, setIsTeamOptionsOpen] = useState<boolean>(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState<boolean>(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceUser[] | null>(null);
  const [displayedMembers, setDisplayedMembers] = useState(workspaceMembers);
  const [membersToInvite, setMembersToInvite] = useState<WorkspaceUser[]>([]);
  const [searchedMemberString, setSearchedMemberString] = useState<string>('');

  useEffect(() => {
    getTeams();
  }, []);

  useEffect(() => {
    const membersByName = searchMembers(workspaceMembers, searchedMemberString);
    const membersByEmail = searchMembersEmail(workspaceMembers, searchedMemberString);

    const newDisplayedMembers = [...membersByName, ...membersByEmail];
    const uniqueDisplayedMembers = Array.from(new Set(newDisplayedMembers));

    setDisplayedMembers(uniqueDisplayedMembers);
  }, [searchedMemberString]);

  const getTeams = async () => {
    if (selectedWorkspace) {
      setIsGetTeamsLoading(true);
      try {
        const teams = await workspacesService.getWorkspaceTeams(selectedWorkspace.workspaceUser.workspaceId);
        setTeams(teams);
        if (selectedTeam) {
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

  const getTeamMembers = async (teamId) => {
    setIsGetTeamMembersLoading(true);
    try {
      const teamMembers = await workspacesService.getTeamMembers(teamId);
      setSelectedTeamMembers(teamMembers);
    } catch (err) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
    }
    setIsGetTeamMembersLoading(false);
  };

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

  const handleMemberHover = (memberUuid) => {
    setHoveredMember(memberUuid);
  };

  const handleMemberLeave = () => {
    setHoveredMember(null);
    isMemberOptionsOpen && setIsMemberOptionsOpen(false);
  };

  const selectMemberToInvite = (member: WorkspaceUser) => {
    const isMemberSelected = membersToInvite.some((m) => m.member.uuid === member.member.uuid);

    if (!isMemberSelected) {
      setMembersToInvite([...membersToInvite, member]);
    } else {
      setMembersToInvite(membersToInvite.filter((m) => m.member.uuid !== member.member.uuid));
    }
  };

  const getIsSelectedMember = (member: WorkspaceUser) => {
    return membersToInvite.some((m) => m.member.uuid === member.member.uuid);
  };

  const addMembersToTeam = () => {
    setIsAddMembersLoading(true);
    try {
      if (selectedTeam) {
        membersToInvite.map(async (member) => {
          await workspacesService.addTeamUser(selectedTeam.team.id, member.member.uuid);
        });
      }
      setIsAddMemberDialogOpen(false);
      setMembersToInvite([]);
      setSearchedMemberString('');
      setTimeout(() => {
        getWorkspacesMembers();
        getTeamMembers(selectedTeam?.team.id);
        getTeams();
      }, 500);
    } catch (err) {
      const castedError = errorService.castError(err);
      errorService.reportError(castedError);
    }
    setIsAddMembersLoading(false);
  };

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
        selectedTeam && (await workspacesService.editTeam(selectedTeam?.team.id, renameTeamName));
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
    <Section
      title={selectedTeam ? selectedTeam.team.name : t('preferences.workspace.teams.title')}
      onBackButtonClicked={selectedTeam ? () => setSelectedTeam(null) : undefined}
      onClosePreferences={onClosePreferences}
    >
      {selectedTeam ? (
        <TeamDetails
          team={selectedTeam}
          selectedTeamMembers={selectedTeamMembers}
          hoveredMember={hoveredMember}
          handleMemberHover={handleMemberHover}
          handleMemberLeave={handleMemberLeave}
          setIsMemberOptionsOpen={setIsMemberOptionsOpen}
          isMemberOptionsOpen={isMemberOptionsOpen}
          isTeamOptionsOpen={isTeamOptionsOpen}
          setIsTeamOptionsOpen={setIsTeamOptionsOpen}
          setIsAddMemberDialogOpen={setIsAddMemberDialogOpen}
          getWorkspacesMembers={getWorkspacesMembers}
          isGetTeamMembersLoading={isGetTeamMembersLoading}
          isCurrentUserWorkspaceOwner={isCurrentUserWorkspaceOwner}
          setIsRenameTeamDialogOpen={setIsRenameTeamDialogOpen}
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
      <CreateTeamDialog
        isOpen={isCreateTeamDialogOpen}
        onClose={() => setIsCreateTeamDialogOpen(false)}
        newTeamName={newTeamName}
        setNewTeamName={setNewTeamName}
        isCreateTeamLoading={isCreateTeamLoading}
        createTeam={createTeam}
      />
      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onClose={() => setIsAddMemberDialogOpen(false)}
        displayedMembers={displayedMembers}
        selectMemberToInvite={selectMemberToInvite}
        getIsSelectedMember={getIsSelectedMember}
        isGetWorkspacesMembersLoading={isGetWorkspacesMembersLoading}
        isAddMembersLoading={isAddMembersLoading}
        searchedMemberString={searchedMemberString}
        setSearchedMemberString={setSearchedMemberString}
        membersToInvite={membersToInvite}
        addMembersToTeam={addMembersToTeam}
      />
      <RenameTeamDialog
        isOpen={isRenameTeamDialogOpen}
        onClose={() => setIsRenameTeamDialogOpen(false)}
        renameTeamName={renameTeamName}
        setRenameTeamName={setRenameTeamName}
        isRenameTeamLoading={isRenameTeamLoading}
        renameTeam={renameTeam}
      />
    </Section>
  );
};

export default TeamsSection;
