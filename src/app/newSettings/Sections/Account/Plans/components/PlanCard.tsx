import { Check } from '@phosphor-icons/react';
import { t } from 'i18next';
import Button from '../../../../../shared/components/Button/Button';
import RoleBadge from '../../../Workspace/Members/components/RoleBadge';

export type ChangePlanType = 'upgrade' | 'downgrade' | 'free' | 'manageBilling';

interface PlanCardProps {
  capacity: string;
  currency: string;
  price: string;
  billing: string;
  onClick: () => void;
  changePlanType: ChangePlanType;
  isCurrentPlan?: boolean;
  isLoading: boolean;
}

const PlanCard = ({
  capacity,
  currency,
  price,
  billing,
  onClick,
  changePlanType,
  isCurrentPlan,
  isLoading,
}: PlanCardProps) => {
  return (
    <div className={'flex w-80 flex-col rounded-xl border border-gray-10 bg-gray-5 p-4 '}>
      <div className="flex flex-col space-y-3">
        <div>
          <div className="flex w-full flex-row justify-between">
            <span className="text-2xl font-medium leading-7 text-gray-100">{capacity}</span>
            {isCurrentPlan && (
              <RoleBadge roleText={t('preferences.account.plans.current')} role={'current'} size={'small'} />
            )}
          </div>
          <span className=" text-base font-normal leading-5 text-gray-60">
            {currency + price}
            {billing && '/' + billing}
          </span>
        </div>
        <ChangePlanButton type={changePlanType} onClick={onClick} isLoading={isLoading} />
      </div>
      <Divider />
      <PlanDetailsList planSpace={capacity} />
    </div>
  );
};

const Divider = () => (
  <div className={'flex h-auto items-center justify-center py-6'}>
    <div className="h-px w-full bg-gray-10" />
  </div>
);

const PlanDetailsList = ({ planSpace }) => {
  return (
    <div className="flex flex-col space-y-2">
      <span className="text-sm font-semibold text-gray-100">
        {t('preferences.account.plans.planFeaturesList.title')}
      </span>
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row items-center space-x-2">
          <div>
            <Check size={20} width={20} height={20} />
          </div>
          <span className="text-base font-semibold text-gray-100">
            {planSpace}
            <span className="text-base font-normal text-gray-100">
              {t('preferences.account.plans.planFeaturesList.storage')}
            </span>
          </span>
        </div>
        <div className="flex flex-row items-center space-x-2">
          <div>
            <Check size={20} width={20} height={20} />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t('preferences.account.plans.planFeaturesList.featureOne')}
          </span>
        </div>
        <div className="flex flex-row items-center space-x-2">
          <div>
            <Check size={20} width={20} height={20} />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t('preferences.account.plans.planFeaturesList.featureTwo')}
          </span>
        </div>
        <div className="flex flex-row space-x-2">
          <div className="mt-1">
            <Check size={20} width={20} height={20} />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t('preferences.account.plans.planFeaturesList.featureThree')}
          </span>
        </div>
        <div className="flex flex-row items-center space-x-2">
          <div>
            <Check size={20} width={20} height={20} />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t('preferences.account.plans.planFeaturesList.featureFour')}
          </span>
        </div>
        <div className="flex flex-row space-x-2">
          <div className="mt-1">
            <Check size={20} width={20} height={20} />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t('preferences.account.plans.planFeaturesList.featureFive')}
          </span>
        </div>
      </div>
    </div>
  );
};

const ChangePlanButton = ({ type, onClick, isLoading }) => {
  const changeButtonTypes = {
    upgrade: (
      <Button onClick={onClick} variant="primary" loading={isLoading}>
        {t('preferences.account.plans.upgrade')}
      </Button>
    ),
    downgrade: (
      <Button onClick={onClick} variant="secondary" loading={isLoading}>
        {t('preferences.account.plans.downgrade')}
      </Button>
    ),
    free: (
      <button onClick={onClick} className="text-left text-lg font-medium leading-5 text-primary hover:underline">
        {t('preferences.account.plans.free')}
      </button>
    ),
    manageBilling: (
      <Button onClick={onClick} variant="secondary">
        {t('preferences.account.plans.manageBilling')}
      </Button>
    ),
  };

  return changeButtonTypes[type];
};

export default PlanCard;
