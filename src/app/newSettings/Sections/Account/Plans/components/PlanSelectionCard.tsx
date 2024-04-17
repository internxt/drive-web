import { t } from 'i18next';
import RoleBadge from '../../../Workspace/Members/components/RoleBadge';

interface PlanSelectionCardProps {
  capacity: string;
  currency: string;
  amount: string;
  billing: string;
  isSelected: boolean;
  onClick: () => void;
  isCurrentPlan?: boolean;
}

const PlanSelectionCard = ({
  capacity,
  currency,
  amount,
  billing,
  isSelected,
  onClick,
  isCurrentPlan,
}: PlanSelectionCardProps) => {
  const isSelectedOutsideBorderStyle = isSelected ? 'border-primary/3 bg-primary/3 dark:bg-primary/10' : '';
  const isSelectedInsideBorderStyle = isSelected ? 'border-primary' : '';

  return (
    <div
      className={`-m-1 w-fit rounded-2xl border-4 border-transparent hover:border-primary/3 hover:bg-primary/3 hover:dark:bg-primary/10 ${isSelectedOutsideBorderStyle}`}
    >
      <button
        className={`flex w-80 flex-col rounded-xl border border-gray-10 p-4 hover:border-primary ${isSelectedInsideBorderStyle}`}
        onClick={onClick}
      >
        <div className="flex w-full flex-row justify-between">
          <span className="text-2xl font-medium leading-7 text-gray-100">{capacity}</span>
          {isCurrentPlan && <RoleBadge roleText={t('preferences.account.plans.current')} role={'current'} />}
        </div>
        <span className=" text-base font-normal leading-5 text-gray-60">
          {currency + amount}
          {billing && '/' + billing}
        </span>
      </button>
    </div>
  );
};

export default PlanSelectionCard;
