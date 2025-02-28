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
  let userText = isBusiness ? '/' + t('preferences.account.plans.peruser') : '';
  if (isBusiness && !displayBillingSlash) {
    userText = ' ' + t('preferences.account.plans.user');
  }
  const displayText = displayBillingSlash
    ? `${amount} ${currency}/${billing}${userText}`
    : `${amount} ${currency} ${billing}${userText}`;

  const getPlanFeaturePath = () => {
    const PLAN_TYPES = {
      FREE: t('preferences.account.plans.types.free'),
      ESSENTIAL: t('preferences.account.plans.types.essential'),
      STANDARD: t('preferences.account.plans.types.standard'),
      PRO: t('preferences.account.plans.types.pro'),
      PREMIUM: t('preferences.account.plans.types.premium'),
      ULTIMATE: t('preferences.account.plans.types.ultimate'),
    };

    if (capacity === '1TB') {
      return isBusiness ? PLAN_TYPES.STANDARD : PLAN_TYPES.ESSENTIAL;
    }

    const capacityToFeaturePath = {
      '2TB': PLAN_TYPES.PRO,
      '3TB': PLAN_TYPES.PREMIUM,
      '5TB': PLAN_TYPES.ULTIMATE,
    };

    return capacityToFeaturePath[capacity] || PLAN_TYPES.FREE;
  };

  return (
    <div
      className={`rounded-2xl border border-gray-10 bg-surface dark:border-highlight/10 dark:bg-highlight/5 ${
        !isSelected && 'hover:bg-highlight/5 dark:hover:bg-highlight/10 '
      } ${isSelectedOutsideBorderStyle}`}
    >
      <button
        className={`flex w-full flex-col rounded-xl border-2 border-transparent p-4 ring-offset-2 ring-offset-transparent ${isSelectedInsideBorderStyle}`}
        onClick={onClick}
      >
        <div className="flex w-full flex-col justify-between space-y-2">
          <div className="flex flex-row justify-between">
            <RoleBadge roleText={getPlanFeaturePath()} role={'planType'} size={'small'} />
            {isCurrentPlan && (
              <RoleBadge roleText={t('preferences.account.plans.current')} role={'current'} size={'small'} />
            )}
          </div>
          <span className="text-2xl font-medium leading-7 text-start text-gray-100">{capacity}</span>
        </div>
        <span className=" text-base font-normal leading-5 text-start text-gray-60">{displayText}</span>
      </button>
    </div>
  );
};

export default PlanSelectionCard;
