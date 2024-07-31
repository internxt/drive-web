import Button from 'app/shared/components/Button/Button';
import { t } from 'i18next';

interface TeamsListProps {
  setCreateTeamDialogOpen: (value: boolean) => void;
}

const TeamsList: React.FC<TeamsListProps> = ({ setCreateTeamDialogOpen }) => {
  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-100">1 team</h2>
        <Button variant="primary" onClick={() => setCreateTeamDialogOpen(true)}>
          {t('preferences.workspace.members.invite')}
        </Button>
      </div>
      <div className="rounded-xl">
        <div className="grid h-12 grid-cols-3 rounded-t-xl border border-gray-10 bg-gray-1 py-2 text-base font-medium">
          <div className="col-span-2 flex items-center border-r border-gray-10 pl-5">Team</div>
          <div className="col-span-1 flex items-center pl-5">Members</div>
        </div>
        <div className="grid h-12 grid-cols-3 rounded-b-xl border-x border-b border-gray-10 bg-surface py-2 text-base font-medium">
          <div className="col-span-2 flex items-center pl-5">Development</div>
          <div className="font-regular col-span-1 flex items-center pl-5">5</div>
        </div>
      </div>
    </>
  );
};

export default TeamsList;
