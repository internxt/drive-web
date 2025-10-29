import { WorkspaceData, WorkspaceTeam, TeamMembers } from '@internxt/sdk/dist/workspaces/types';
import { t } from 'i18next';
import { DotsThreeVertical } from '@phosphor-icons/react';

import RoleBadge from 'app/newSettings/Sections/Workspace/Members/components/RoleBadge';
import { Button, Avatar, Loader } from '@internxt/ui';

interface TeamDetailsProps {
  team: WorkspaceTeam;
  selectedTeamMembers: TeamMembers;
  hoveredMember: string | null;
  handleMemberHover: (hoveredMember) => void;
  handleMemberLeave: () => void;
  isMemberOptionsOpen: boolean;
  setIsMemberOptionsOpen: (isMemberOptionsOpen) => void;
  isTeamOptionsOpen: boolean;
  setIsTeamOptionsOpen: (isTeamOptionsOpen) => void;
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

const TeamDetails: React.FC<TeamDetailsProps> = ({
  team,
  selectedTeamMembers,
  hoveredMember,
  handleMemberHover,
  handleMemberLeave,
  isMemberOptionsOpen,
  setIsMemberOptionsOpen,
  isTeamOptionsOpen,
  setIsTeamOptionsOpen,
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
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="break-all pr-2 text-xl font-medium text-gray-100">{team.team.name}</h3>
          <h4 className="font-regular mt-0.5 text-base text-gray-60">
            <span>{selectedTeamMembers.length} </span>
            <span>
              {selectedTeamMembers.length !== 1
                ? t('preferences.workspace.teams.teamDetails.members')
                : t('preferences.workspace.teams.teamDetails.member')}
            </span>
          </h4>
        </div>
        <div className="relative flex items-center">
          {(isCurrentUserWorkspaceOwner || isCurrentUserManager) && (
            <div className="flex">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAddMemberDialogOpen(true);
                  getWorkspacesMembers();
                }}
              >
                <span>{t('preferences.workspace.teams.teamDetails.addMember')}</span>
              </Button>
              <button
                className="ml-2 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-10 bg-surface text-gray-80 shadow-sm hover:border-gray-20 active:bg-gray-1 dark:bg-gray-5 dark:active:bg-gray-10"
                onClick={() => {
                  setIsTeamOptionsOpen(!isTeamOptionsOpen);
                }}
              >
                <DotsThreeVertical size={24} />
              </button>
            </div>
          )}
          {isTeamOptionsOpen && (
            <div
              onMouseLeave={() => {
                setIsTeamOptionsOpen(!isTeamOptionsOpen);
              }}
              className="absolute right-0 top-11 z-10 flex w-40 flex-col rounded-lg border border-gray-10 bg-surface py-1.5 shadow-sm"
            >
              <button
                onClick={() => {
                  setIsRenameTeamDialogOpen(true);
                  setIsTeamOptionsOpen(!isTeamOptionsOpen);
                }}
                className="font-regular z-50 ml-5 flex h-9 items-center text-base text-gray-100"
              >
                {t('preferences.workspace.teams.teamDetails.rename')}
              </button>
              <button
                onClick={() => {
                  setIsDeleteTeamDialogOpen(true);
                  setIsTeamOptionsOpen(!isTeamOptionsOpen);
                }}
                className="font-regular z-50 ml-5 flex h-9 items-center text-base text-gray-100"
              >
                {t('preferences.workspace.teams.teamDetails.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
      {isGetTeamMembersLoading ? (
        <div className="!mt-10 flex h-full w-full justify-center">
          <Loader classNameLoader="h-8 w-8" />
        </div>
      ) : (
        <div className="pb-5">
          {selectedTeamMembers.map((member) => {
            const isManager = team.team.managerId === member.uuid;
            const isLastItem = selectedTeamMembers.indexOf(member) === selectedTeamMembers.length - 1;
            const isFirstItem = selectedTeamMembers.indexOf(member) === 0;

            return (
              <button
                className={`flex h-14 w-full cursor-default items-center justify-between border-x border-b border-gray-10 bg-surface px-3 py-2.5 text-base font-medium hover:bg-gray-5 ${
                  isLastItem && 'rounded-b-xl'
                } ${isFirstItem && 'rounded-t-xl border-t'}`}
                onMouseEnter={() => handleMemberHover(member.uuid)}
                onMouseLeave={handleMemberLeave}
                key={member.uuid}
              >
                <div className="flex flex-row space-x-2">
                  <Avatar src={member.avatar} fullName={`${member.name} ${member.lastname}`} diameter={36} />
                  <div className="flex flex-col">
                    <div className="flex flex-row justify-between space-x-2">
                      <span className="break-all text-base font-medium leading-5 text-gray-100">
                        {member.name} {member.lastname}
                      </span>
                      {isManager && (
                        <RoleBadge
                          role="manager"
                          roleText={t('preferences.workspace.members.role.manager')}
                          size={'small'}
                        />
                      )}
                    </div>
                    <span className="break-all text-left text-sm font-normal leading-4 text-gray-50">
                      {member.email}
                    </span>
                  </div>
                </div>
                {hoveredMember === member.uuid && (isCurrentUserManager || isCurrentUserWorkspaceOwner) && (
                  <div className="relative flex items-center">
                    <div className="flex items-center">
                      {!isManager && (
                        <Button
                          variant="secondary"
                          size="medium"
                          onClick={() => {
                            setTeamMemberToRemove(member);
                            setIsRemoveTeamMemberDialogOpen(true);
                          }}
                        >
                          <span>{t('preferences.workspace.teams.teamDetails.remove')}</span>
                        </Button>
                      )}
                      {!isManager && (
                        <button
                          className="ml-2 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-10 bg-surface text-gray-80 shadow-sm hover:border-gray-20 active:bg-gray-1 dark:bg-gray-5 dark:active:bg-gray-10"
                          onClick={() => {
                            setIsMemberOptionsOpen(!isMemberOptionsOpen);
                          }}
                        >
                          <DotsThreeVertical size={24} />
                        </button>
                      )}
                    </div>
                    {isMemberOptionsOpen && (
                      <div className="absolute right-0 top-9 z-10 flex w-40 items-center rounded-lg border border-gray-10 bg-surface shadow-sm">
                        <button
                          className="font-regular z-50 ml-5 flex h-12 items-center text-base text-gray-100"
                          onClick={() => {
                            handleChangeManagerClicked(member);
                          }}
                        >
                          {t('preferences.workspace.teams.teamDetails.makeManager')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TeamDetails;
