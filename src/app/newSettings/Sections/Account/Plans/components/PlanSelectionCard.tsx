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
  displayBillingSlash?: boolean;
}

const PlanSelectionCard = ({
  capacity,
  currency,
  amount,
  billing,
  isSelected,
  onClick,
  isCurrentPlan,
  displayBillingSlash,
}: PlanSelectionCardProps) => {
  const isSelectedOutsideBorderStyle = (isSelected && isCurrentPlan) || isSelected ? 'border-transparent' : '';
  const isSelectedInsideBorderStyle =
    (isSelected && isCurrentPlan) || isSelected
      ? '!border-primary ring ring-primary/10 bg-primary/3 dark:bg-primary/10 dark:ring-primary/30'
      : '';
  const billingText = displayBillingSlash ? ` /${billing}` : ` ${billing}`;
  return (
    <div
      className={`w-fit rounded-2xl border border-gray-10 bg-surface hover:bg-highlight/5 dark:border-highlight/10 dark:bg-highlight/5 dark:hover:bg-highlight/10 ${isSelectedOutsideBorderStyle}`}
    >
      <button
        className={`flex w-80 flex-col rounded-xl border-2 border-transparent p-4 ring-offset-2 ring-offset-transparent ${isSelectedInsideBorderStyle}`}
        onClick={onClick}
      >
        <div className="flex w-full flex-row justify-between">
          <span className="text-2xl font-medium leading-7 text-gray-100">{capacity}</span>
          {isCurrentPlan && (
            <RoleBadge roleText={t('preferences.account.plans.current')} role={'current'} size={'small'} />
          )}
        </div>
        <span className=" text-base font-normal leading-5 text-gray-60">
          {currency + amount}
          {billing && billingText}
        </span>
      </button>
    </div>
  );
};

export default PlanSelectionCard;
