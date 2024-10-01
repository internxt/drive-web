import { t } from 'i18next';
import RoleBadge from '../../../../Workspace/Members/components/RoleBadge';

interface PlanSelectionCardProps {
  capacity: string;
  currency: string;
  amount: string;
  billing: string;
  isSelected: boolean;
  onClick: () => void;
  isCurrentPlan?: boolean;
  displayBillingSlash?: boolean;
  isBusiness?: boolean;
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
  isBusiness = false,
}: PlanSelectionCardProps) => {
  const selectedValidation = (isSelected && isCurrentPlan) || isSelected;
  const isSelectedOutsideBorderStyle = selectedValidation ? 'border-transparent' : '';
  const isSelectedInsideBorderStyle = selectedValidation
    ? '!border-primary ring ring-primary/10 bg-primary/3 dark:bg-primary/10 dark:ring-primary/30'
    : '';
  let userText = isBusiness ? '/' + t('preferences.account.plans.user') : '';
  if (isBusiness && !displayBillingSlash) {
    userText = ' ' + t('preferences.account.plans.user');
  }
  const displayText = displayBillingSlash
    ? `${amount} ${currency}/${billing}${userText}`
    : `${amount} ${currency} ${billing}${userText}`;
  return (
    <div
      className={`rounded-2xl border border-gray-10 bg-surface dark:border-highlight/10 dark:bg-highlight/5 ${
        !isSelected && 'hover:bg-highlight/5 dark:hover:bg-highlight/10'
      } ${isSelectedOutsideBorderStyle}`}
    >
      <button
        className={`flex w-full flex-col rounded-xl border-2 border-transparent p-4 ring-offset-2 ring-offset-transparent ${isSelectedInsideBorderStyle}`}
        onClick={onClick}
      >
        <div className="flex w-full flex-row justify-between">
          <span className="text-2xl font-medium leading-7 text-gray-100">{capacity}</span>
          {isCurrentPlan && (
            <RoleBadge roleText={t('preferences.account.plans.current')} role={'current'} size={'small'} />
          )}
        </div>
        <span className=" text-base font-normal leading-5 text-gray-60">{displayText}</span>
      </button>
    </div>
  );
};

export default PlanSelectionCard;
