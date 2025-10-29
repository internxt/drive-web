import { t } from 'i18next';
import { TeamsTabProps } from '../../../../types/types';
import EmptyTab from 'app/newSettings/components/EmptyTab';
import RoleBadge from './RoleBadge';

import membersTeams from 'assets/icons/empty/members-teams.svg';

const TeamsTab = ({ role, teams, isTeams }: TeamsTabProps): JSX.Element => {
  const isOwner = role === 'owner';
  const isUserTeams = teams.length > 0;

  const createTeam = () => {};

  return (
    <div>
      {isOwner && !isTeams && (
        <EmptyTab
          icon={membersTeams}
          title={t('preferences.workspace.members.tabs.teams.emptyTeamsOwner.title')}
          subtitle={t('preferences.workspace.members.tabs.teams.emptyTeamsOwner.subtitle')}
          action={{
            text: t('preferences.workspace.members.tabs.teams.emptyTeamsOwner.action'),
            onClick: createTeam,
          }}
        />
      )}

      {!isOwner && !isTeams && (
        <EmptyTab
          icon={membersTeams}
          title={t('preferences.workspace.members.tabs.teams.emptyTeamsMember.title')}
          subtitle={t('preferences.workspace.members.tabs.teams.emptyTeamsMember.subtitle')}
        />
      )}

      {isUserTeams && isTeams && (
        <>
          <div className="flex h-12 w-full items-center rounded-t-xl border border-gray-10 bg-gray-1 text-base font-medium text-gray-100">
            <p className="w-3/5 border-r border-gray-10 pl-5">{t('preferences.workspace.members.tabs.teams.title')}</p>
            <p className="pl-5">{t('preferences.workspace.members.tabs.teams.role')}</p>
          </div>
          {teams.map((team) => {
            const isLastTeam = teams.length === teams.indexOf(team) + 1;

            return (
              <div
                key={team.team}
                className={`flex h-12 w-full items-center border-b border-l border-r border-gray-5 text-base font-medium text-gray-100 ${
                  isLastTeam && 'rounded-b-xl'
                }`}
              >
                <p className="w-3/5 pl-5">{team.team}</p>
                <p className="pl-5">
                  <RoleBadge
                    role={team.role}
                    roleText={t(`preferences.workspace.members.role.${team.role}`)}
                    size={'medium'}
                  />
                </p>
              </div>
            );
          })}
        </>
      )}

      {!isUserTeams && isTeams && (
        <section className="flex h-40 w-full flex-col items-center justify-center rounded-xl border border-gray-10 bg-gray-1 py-10">
          <p className="font-regular text-center text-base text-gray-50">
            {t('preferences.workspace.members.tabs.teams.emptyTeams.title')}
          </p>
        </section>
      )}
    </div>
  );
};

export default TeamsTab;
