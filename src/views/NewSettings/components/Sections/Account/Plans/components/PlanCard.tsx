import { Check } from '@phosphor-icons/react';
import { t } from 'i18next';
import { Button } from '@internxt/ui';
import RoleBadge from '../../../Workspace/Members/components/RoleBadge';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export type ChangePlanType = 'upgrade' | 'downgrade' | 'free' | 'manageBilling';

interface PlanCardProps {
  capacity: string;
  currency: string;
  price: string;
  showBilling?: boolean;
  onClick: () => void;
  changePlanType: ChangePlanType;
  isCurrentPlan?: boolean;
  isLoading: boolean;
  disableActionButton: boolean;
}

export const getPlan = (capacity) => {
  const PLAN_TYPES = {
    FREE: t('preferences.account.plans.types.free'),
    ESSENTIAL: t('preferences.account.plans.types.essential'),
    STANDARD: t('preferences.account.plans.types.standard'),
    PRO: t('preferences.account.plans.types.pro'),
    PREMIUM: t('preferences.account.plans.types.premium'),
    ULTIMATE: t('preferences.account.plans.types.ultimate'),
  };

  const capacityToFeaturePath = {
    '1TB': PLAN_TYPES.ESSENTIAL,
    '3TB': PLAN_TYPES.PREMIUM,
    '5TB': PLAN_TYPES.ULTIMATE,
  };

  return capacityToFeaturePath[capacity] || PLAN_TYPES.FREE;
};

const PlanCard = ({
  capacity,
  currency,
  price,
  showBilling = false,
  onClick,
  changePlanType,
  isCurrentPlan,
  isLoading,
  disableActionButton,
}: PlanCardProps) => {
  const userText = ' ' + t('preferences.account.plans.billedAnnually');

  return (
    <div className={'flex w-80 flex-col rounded-xl border border-gray-10 bg-gray-5 p-4 '}>
      <div className="flex flex-col space-y-3">
        <div>
          <div className="flex w-full flex-row justify-between">
            <span className="text-2xl font-medium leading-7 text-gray-100">{getPlan(capacity)}</span>
            {isCurrentPlan && (
              <RoleBadge roleText={t('preferences.account.plans.current')} role={'current'} size={'small'} />
            )}
          </div>
          <span className=" text-base font-normal leading-5 text-gray-60">
            {currency + price}
            {showBilling && userText}
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
      <PlanDetailsList planSpace={capacity} />
    </div>
  );
};

const Divider = () => (
  <div className={'flex h-auto items-center justify-center py-6'}>
    <div className="h-px w-full bg-gray-10" />
  </div>
);

const PlanDetailsList = ({ planSpace }: { planSpace: string }) => {
  const { translateList } = useTranslationContext();
  const planType = 'planFeaturesList';

  const featureKeys = translateList(`preferences.account.plans.${planType}.${planSpace ?? 'freeFeatures'}.features`);

  const comingSoonFeatureKeys = translateList(`preferences.account.plans.${planType}.${planSpace}.comingSoonFeatures`);

  return (
    <div className="flex flex-col space-y-2">
      <span className="text-sm font-semibold text-gray-100">
        {t('preferences.account.plans.planFeaturesList.title')}
      </span>
      <div className="flex flex-col space-y-2">
        {featureKeys.map((feature) => (
          <div key={feature} className="flex flex-row items-start space-x-2">
            <div>
              <Check size={20} className="text-green" />
            </div>
            <span className="text-base font-normal text-gray-100">{feature}</span>
          </div>
        ))}

        {Array.isArray(comingSoonFeatureKeys) && comingSoonFeatureKeys.length > 0 && (
          <>
            <span className="text-sm font-semibold text-gray-100">
              {t('preferences.account.plans.planFeaturesList.comingSoon')}
            </span>
            {comingSoonFeatureKeys.map((feature) => (
              <div key={feature} className="flex flex-row space-x-2">
                <div className="mt-1">
                  <Check size={20} className="text-green" />
                </div>
                <span className="text-base font-normal text-gray-100">{feature}</span>
              </div>
            ))}
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
