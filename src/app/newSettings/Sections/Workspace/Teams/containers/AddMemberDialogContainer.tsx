import { useEffect, useState } from 'react';
import { WorkspaceUser, WorkspaceTeam } from '@internxt/sdk/dist/workspaces/types';

import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';

import { searchMembers, searchMembersEmail } from '../../../../utils/membersUtils';
import AddMemberDialog from '../components/AddMemberDialog';

interface AddMemberDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceMembers: WorkspaceUser[] | null;
  displayedMembers: WorkspaceUser[] | null;
  setDisplayedMembers: (workspaceMembers) => void;
  isGetWorkspacesMembersLoading: boolean;
  selectedTeam: WorkspaceTeam | null;
  setIsAddMemberDialogOpen: (boolean) => void;
  getWorkspacesMembers: () => Promise<void>;
  getTeamMembers: (team: WorkspaceTeam) => Promise<void>;
  getTeams: () => Promise<void>;
}

const AddMemberDialogContainer: React.FC<AddMemberDialogContainerProps> = ({
  isOpen,
  onClose,
  workspaceMembers,
  displayedMembers,
  setDisplayedMembers,
  isGetWorkspacesMembersLoading,
  selectedTeam,
  setIsAddMemberDialogOpen,
  getWorkspacesMembers,
  getTeamMembers,
  getTeams,
}) => {
  const [membersToInvite, setMembersToInvite] = useState<WorkspaceUser[]>([]);
  const [searchedMemberString, setSearchedMemberString] = useState<string>('');
  const [isAddMembersLoading, setIsAddMembersLoading] = useState<boolean>(false);

  useEffect(() => {
    const membersByName = searchMembers(workspaceMembers, searchedMemberString);
    const membersByEmail = searchMembersEmail(workspaceMembers, searchedMemberString);

    const newDisplayedMembers = [...membersByName, ...membersByEmail];
    const uniqueDisplayedMembers = Array.from(new Set(newDisplayedMembers));

    setDisplayedMembers(uniqueDisplayedMembers);
  }, [searchedMemberString]);

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

  return (
    <AddMemberDialog
      isOpen={isOpen}
      onClose={onClose}
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
  );
};

export default AddMemberDialogContainer;
