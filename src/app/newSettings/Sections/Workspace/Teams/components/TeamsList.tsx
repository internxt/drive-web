import { t } from 'i18next';
import { WorkspaceTeam, WorkspaceTeamResponse } from '@internxt/sdk/dist/workspaces/types';

import { Button, Loader } from '@internxt/ui';
import EmptyTab from 'app/newSettings/components/EmptyTab';

import membersTeams from 'assets/icons/empty/members-teams.svg';
interface TeamsListProps {
  setIsCreateTeamDialogOpen: (value: boolean) => void;
  teams: WorkspaceTeamResponse;
  isCurrentUserWorkspaceOwner: boolean;
  setSelectedTeam: (team: WorkspaceTeam) => void;
  getTeamMembers: (team: WorkspaceTeam) => void;
  isGetTeamsLoading: boolean;
}

const TeamsList: React.FC<TeamsListProps> = ({
  setIsCreateTeamDialogOpen,
  teams,
  isCurrentUserWorkspaceOwner,
  setSelectedTeam,
  getTeamMembers,
  isGetTeamsLoading,
}) => {
  return (
    <section className="space-y-3">
      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-100">
          <span>{teams.length} </span>
          <span>
            {teams.length != 1 ? t('preferences.workspace.teams.title') : t('preferences.workspace.teams.team')}
          </span>
        </h2>
        {isCurrentUserWorkspaceOwner && (
          <Button variant="primary" onClick={() => setIsCreateTeamDialogOpen(true)}>
            {t('preferences.workspace.teams.createTeam')}
          </Button>
        )}
      </div>
      {isGetTeamsLoading && (
        <div className="!mt-10 flex flex h-full w-full justify-center">
          <Loader classNameLoader="h-8 w-8" />
        </div>
      )}

      {!isGetTeamsLoading && teams.length > 0 && (
        <div className="rounded-xl">
          <div className="grid h-12 grid-cols-3 rounded-t-xl border border-gray-10 bg-gray-1 py-2 text-base font-medium">
            <div className="col-span-2 flex items-center border-r border-gray-10 pl-5">
              {t('preferences.workspace.teams.team')}
            </div>
            <div className="col-span-1 flex items-center pl-5">{t('preferences.workspace.teams.members')}</div>
          </div>

          {teams.map((team) => {
            const isLastTeam = teams.length === teams.indexOf(team) + 1;
            return (
              <button
                onClick={() => {
                  setSelectedTeam(team);
                  getTeamMembers(team);
                }}
                tabIndex={0}
                aria-label="Select team"
                key={team.team.id}
                className={`grid w-full cursor-pointer grid-cols-3 items-center border-x border-b border-gray-10 bg-surface py-3 text-base font-medium hover:bg-gray-5 ${
                  isLastTeam && 'rounded-b-xl'
                }`}
              >
                <div className="col-span-2 flex items-center break-all pl-5 text-left">{team.team.name}</div>
                <div className="font-regular col-span-1 flex items-center pl-5">{team.membersCount}</div>
              </button>
            );
          })}
        </div>
      )}

      {!isGetTeamsLoading && teams.length === 0 && isCurrentUserWorkspaceOwner && (
        <EmptyTab
          icon={membersTeams}
          title={t('preferences.workspace.members.tabs.teams.emptyTeamsOwner.title')}
          subtitle={t('preferences.workspace.members.tabs.teams.emptyTeamsOwner.subtitle')}
        />
      )}

      {!isGetTeamsLoading && teams.length === 0 && !isCurrentUserWorkspaceOwner && (
        <EmptyTab
          icon={membersTeams}
          title={t('preferences.workspace.members.tabs.teams.emptyTeamsMember.title')}
          subtitle={t('preferences.workspace.members.tabs.teams.emptyTeamsMember.subtitle')}
        />
      )}
    </section>
  );
};

export default TeamsList;
