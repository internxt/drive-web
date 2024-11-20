import { useState } from 'react';

import { WorkspaceData, WorkspaceTeam, TeamMembers } from '@internxt/sdk/dist/workspaces/types';

import TeamDetails from '../components/TeamDetails';

interface TeamDetailsContainerProps {
  team: WorkspaceTeam;
  selectedTeamMembers: TeamMembers;
  setIsAddMemberDialogOpen: (boolean) => void;
  getWorkspacesMembers: () => Promise<void>;
  isGetTeamMembersLoading: boolean;
  isCurrentUserWorkspaceOwner: boolean;
  setIsRenameTeamDialogOpen: (boolean) => void;
  setIsDeleteTeamDialogOpen: (boolean) => void;
  setIsRemoveTeamMemberDialogOpen: (boolean) => void;
  setTeamMemberToRemove: (TeamMember) => void;
  handleChangeManagerClicked: (TeamMember) => void;
  selectedWorkspace: WorkspaceData | null;
  isCurrentUserManager: boolean;
}

const TeamDetailsContainer: React.FC<TeamDetailsContainerProps> = ({
  team,
  selectedTeamMembers,
  setIsAddMemberDialogOpen,
  getWorkspacesMembers,
  isGetTeamMembersLoading,
  isCurrentUserWorkspaceOwner,
  setIsRenameTeamDialogOpen,
  setIsDeleteTeamDialogOpen,
  setIsRemoveTeamMemberDialogOpen,
  setTeamMemberToRemove,
  handleChangeManagerClicked,
  selectedWorkspace,
  isCurrentUserManager,
}) => {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [isMemberOptionsOpen, setIsMemberOptionsOpen] = useState<boolean>(false);
  const [isTeamOptionsOpen, setIsTeamOptionsOpen] = useState<boolean>(false);

  const handleMemberHover = (memberUuid) => {
    setHoveredMember(memberUuid);
  };

  const handleMemberLeave = () => {
    setHoveredMember(null);
    isMemberOptionsOpen && setIsMemberOptionsOpen(false);
  };

  return (
    <TeamDetails
      team={team}
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
  );
};

export default TeamDetailsContainer;
