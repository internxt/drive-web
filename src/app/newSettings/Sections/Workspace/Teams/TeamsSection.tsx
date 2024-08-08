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
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { searchMembers, searchMembersEmail } from '../../../../newSettings/utils/membersUtils';

import Section from 'app/newSettings/components/Section';
import TeamsList from './components/TeamsList';
import CreateTeamDialog from './components/CreateTeamDialog';
import TeamDetails from './components/TeamDetails';
import AddMemberDialog from './components/AddMemberDialog';
import RenameTeamDialog from './components/RenameTeamDialog';
import DeleteTeamDialog from './components/DeleteTeamDialog';
import RemoveTeamMemberDialog from './components/RemoveTeamMemberDialog';
import ChangeManagerDialog from './components/ChangeManagerDialog';

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
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [renameTeamName, setRenameTeamName] = useState<string>('');
  const [isCreateTeamLoading, setIsCreateTeamLoading] = useState<boolean>(false);
  const [isRenameTeamLoading, setIsRenameTeamLoading] = useState<boolean>(false);
  const [isDeleteTeamLoading, setIsDeleteTeamLoading] = useState<boolean>(false);
  const [isGetTeamsLoading, setIsGetTeamsLoading] = useState<boolean>(false);
  const [isGetTeamMembersLoading, setIsGetTeamMembersLoading] = useState<boolean>(false);
  const [isGetWorkspacesMembersLoading, setIsGetWorkspacesMembersLoading] = useState<boolean>(false);
  const [isAddMembersLoading, setIsAddMembersLoading] = useState<boolean>(false);
  const [isRemoveTeamMemberLoading, setIsRemoveTeamMemberLoading] = useState<boolean>(false);
  const [isChangeManagerLoading, setIsChangeManagerLoading] = useState<boolean>(false);
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
  const [teamMemberToRemove, setTeamMemberToRemove] = useState<TeamMember | null>(null);
  const [newTeamManager, setNewTeamManager] = useState<TeamMember | null>(null);
  const [currentTeamManager, setCurrentTeamManager] = useState<TeamMember | null>(null);
  const [isCurrentUserManager, setIsCurrentUserManager] = useState<boolean>(false);

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
        selectedTeam && getTeamMembers(selectedTeam);
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
      <DeleteTeamDialog
        isOpen={isDeleteTeamDialogOpen}
        onClose={() => setIsDeleteTeamDialogOpen(false)}
        isDeleteTeamLoading={isDeleteTeamLoading}
        deleteTeam={deleteTeam}
        selectedTeam={selectedTeam}
      />
      <RemoveTeamMemberDialog
        isOpen={isRemoveTeamMemberDialogOpen}
        onClose={() => setIsRemoveTeamMemberDialogOpen(false)}
        isRemoveTeamMemberLoading={isRemoveTeamMemberLoading}
        removeTeamMember={removeTeamMember}
        teamMemberToRemove={teamMemberToRemove}
      />
      <ChangeManagerDialog
        isOpen={isChangeManagerDialogOpen}
        onClose={() => setIsChangeManagerDialogOpen(false)}
        isChangeManagerLoading={isChangeManagerLoading}
        changeManager={changeManager}
        newTeamManager={newTeamManager}
        currentTeamManager={currentTeamManager}
      />
    </Section>
  );
};

export default TeamsSection;
