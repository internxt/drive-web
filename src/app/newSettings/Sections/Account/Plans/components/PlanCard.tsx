import { Check } from '@phosphor-icons/react';
import { t } from 'i18next';
import { Button } from '@internxt/ui';
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
  disableActionButton: boolean;
  isBusiness?: boolean;
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
  disableActionButton,
  isBusiness = false,
}: PlanCardProps) => {
  const userText = isBusiness ? '/' + t('preferences.account.plans.user') : '';

  const planTypeTextPath = (() => {
    if (capacity === '1TB') {
      if (!isBusiness) {
        return 'essentialFeatures';
      } else {
        return 'standardFeatures';
      }
    } else if (capacity === '2TB') {
      return 'proFeatures';
    } else if (capacity === '3TB') {
      return 'premiumFeatures';
    } else if (capacity === '5TB') {
      return 'ultimateFeatures';
    } else {
      return 'freeFeatures';
    }
  })();

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
            {billing && '/' + billing + userText}
          </span>
        </div>
        <ChangePlanButton
          type={changePlanType}
          onClick={onClick}
          isLoading={isLoading}
          disabled={changePlanType === 'manageBilling' ? false : disableActionButton}
        />
      </div>
      <Divider />
      <PlanDetailsList planSpace={capacity} isBusiness={isBusiness} planTypeTextPath={planTypeTextPath} />
    </div>
  );
};

const Divider = () => (
  <div className={'flex h-auto items-center justify-center py-6'}>
    <div className="h-px w-full bg-gray-10" />
  </div>
);

const PlanDetailsList = ({
  planSpace,
  isBusiness,
  planTypeTextPath,
}: {
  planSpace: string;
  isBusiness: boolean;
  planTypeTextPath: string;
}) => {
  const planType = isBusiness ? 'businessPlanFeaturesList' : 'planFeaturesList';

  return (
    <div className="flex flex-col space-y-2">
      <span className="text-sm font-semibold text-gray-100">
        {t('preferences.account.plans.planFeaturesList.title')}
      </span>
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row items-start space-x-2">
          <div>
            <Check size={20} width={20} height={20} className="text-green " />
          </div>
          <span className="text-base font-semibold text-gray-100">
            {planSpace}
            <span className="text-base font-normal text-gray-100">
              {t('preferences.account.plans.planFeaturesList.storage')}
            </span>
          </span>
        </div>
        <div className="flex flex-row items-start space-x-2">
          <div>
            <Check size={20} width={20} height={20} className="text-green" />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureOne`)}
          </span>
        </div>
        <div className="flex flex-row items-center space-x-2">
          <div>
            <Check size={20} width={20} height={20} className="text-green" />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureTwo`)}
          </span>
        </div>
        <div className="flex flex-row space-x-2">
          <div className="mt-1">
            <Check size={20} width={20} height={20} className="text-green" />
          </div>
          <span className="text-base font-normal text-gray-100">
            {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureThree`)}
          </span>
        </div>
        {planTypeTextPath !== 'freeFeatures' && (
          <>
            <div className="flex flex-row items-center space-x-2">
              <div>
                <Check size={20} width={20} height={20} className="text-green" />
              </div>
              <span className="text-base font-normal text-gray-100">
                {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureFour`)}
              </span>
            </div>
            <div className="flex flex-row space-x-2">
              <div className="mt-1">
                <Check size={20} width={20} height={20} className="text-green" />
              </div>
              <span className="text-base font-normal text-gray-100">
                {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureFive`)}
              </span>
            </div>
            <div className="flex flex-row space-x-2">
              <div className="mt-1">
                <Check size={20} width={20} height={20} className="text-green" />
              </div>
              <span className="text-base font-normal text-gray-100">
                {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureSix`)}
              </span>
            </div>
            <div className="flex flex-row space-x-2">
              <div className="mt-1">
                <Check size={20} width={20} height={20} className="text-green" />
              </div>
              <span className="text-base font-normal text-gray-100">
                {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureSeven`)}
              </span>
            </div>
            <div className="flex flex-row space-x-2">
              <div className="mt-1">
                <Check size={20} width={20} height={20} className="text-green" />
              </div>
              <span className="text-base font-normal text-gray-100">
                {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureEight`)}
              </span>
            </div>
          </>
        )}

        {isBusiness && (
          <div className="flex flex-row space-x-2">
            <div className="mt-1">
              <Check size={20} width={20} height={20} className="text-green" />
            </div>
            <span className="text-base font-normal text-gray-100">
              {t(`preferences.account.plans.${planType}.${planTypeTextPath}.featureNine`)}
            </span>
          </div>
        )}

        {/* Comming soon features */}
        {planTypeTextPath !== 'essentialFeatures' && planTypeTextPath !== 'freeFeatures' && (
          <>
            <span className="text-sm font-semibold text-gray-100">
              {t('preferences.account.plans.planFeaturesList.commingSoon')}
            </span>
            <div className="flex flex-row space-x-2">
              <div className="mt-1">
                <Check size={20} width={20} height={20} className="dark:text-black" />
              </div>
              <span className="text-base font-normal text-gray-100">
                {t(`preferences.account.plans.${planType}.${planTypeTextPath}.commingSoonFeatures.featureOne`)}
              </span>
            </div>
            <div className="flex flex-row space-x-2">
              <div className="mt-1">
                <Check size={20} width={20} height={20} className="dark:text-black" />
              </div>
              <span className="text-base font-normal text-gray-100">
                {t(`preferences.account.plans.${planType}.${planTypeTextPath}.commingSoonFeatures.featureTwo`)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ChangePlanButton = ({ type, onClick, isLoading, disabled }) => {
  const changeButtonTypes = {
    upgrade: (
      <Button onClick={onClick} variant="primary" loading={isLoading} disabled={disabled}>
        {t('preferences.account.plans.upgrade')}
      </Button>
    ),
    downgrade: (
      <Button onClick={onClick} variant="secondary" loading={isLoading} disabled={disabled}>
        {t('preferences.account.plans.downgrade')}
      </Button>
    ),
    manageBilling: (
      <Button onClick={onClick} variant="secondary" disabled={disabled}>
        {t('preferences.account.plans.manageBilling')}
      </Button>
    ),
  };

  return changeButtonTypes[type];
};

export default PlanCard;
