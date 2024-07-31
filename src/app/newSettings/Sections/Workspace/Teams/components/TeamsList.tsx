import { t } from 'i18next';
import { WorkspaceTeamResponse } from '@internxt/sdk/dist/workspaces/types';

import Button from 'app/shared/components/Button/Button';

interface TeamsListProps {
  setCreateTeamDialogOpen: (value: boolean) => void;
  teams: WorkspaceTeamResponse;
  isCurrentUserWorkspaceOwner: boolean;
}

const TeamsList: React.FC<TeamsListProps> = ({ setCreateTeamDialogOpen, teams, isCurrentUserWorkspaceOwner }) => {
  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-100">
          <span>{teams.length} </span>
          <span>
            {teams.length != 1 ? t('preferences.workspace.teams.title') : t('preferences.workspace.teams.team')}
          </span>
        </h2>
        {isCurrentUserWorkspaceOwner && (
          <Button variant="primary" onClick={() => setCreateTeamDialogOpen(true)}>
            {t('preferences.workspace.teams.createTeam')}
          </Button>
        )}
      </div>
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
            <div
              key={team.team.id}
              className={`grid h-12 cursor-pointer grid-cols-3 border-x border-b border-gray-10 bg-surface py-2 text-base font-medium hover:bg-gray-5 ${
                isLastTeam && 'rounded-b-xl'
              }`}
            >
              <div className="col-span-2 flex items-center pl-5">{team.team.name}</div>
              <div className="font-regular col-span-1 flex items-center pl-5">{team.membersCount}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default TeamsList;
