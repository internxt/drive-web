import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import PlanCard, { ChangePlanType } from '../PlanCard';
import { bytesToString } from 'app/drive/services/size.service';
import currencyService from 'app/payment/services/currency.service';
import { displayAmount } from '../../utils/planUtils';
import { InfoPlanCardSkeleton } from './skeletons/InfoPlanCardSkeleton';

interface InfoCardComponentProps {
  pricesToRender: DisplayPrice[];
  priceSelected: DisplayPrice;
  freePlanData: DisplayPrice;
  isBusinessPlan: boolean;
  currentChangePlanType: ChangePlanType;
  isCurrentFreePlan: boolean;
  isCurrentPlan: boolean;
  isLoadingCheckout: boolean;
  onCancelSubscription: (cancelSubscription: boolean) => void;
  handleOnPlanSelected: (priceSelected: DisplayPrice) => void;
  translate: (key: string, props?: Record<string, unknown>) => string;
}

export const InfoCardComponent = ({
  pricesToRender,
  priceSelected,
  isCurrentFreePlan,
  freePlanData,
  isCurrentPlan,
  currentChangePlanType,
  isLoadingCheckout,
  isBusinessPlan,
  onCancelSubscription,
  handleOnPlanSelected,
  translate,
}: InfoCardComponentProps) => {
  const isPriceData = priceSelected?.id === freePlanData.id;

  return (
    <>
      {pricesToRender.length > 0 ? (
        <>
          {isPriceData ? (
            <PlanCard
              onClick={() => onCancelSubscription(true)}
              isCurrentPlan={isCurrentFreePlan}
              capacity={bytesToString(priceSelected?.bytes ?? 0)}
              currency={translate('preferences.account.plans.freeForever')}
              price={''}
              billing={''}
              changePlanType={currentChangePlanType}
              isLoading={isLoadingCheckout}
              disableActionButton={false}
            />
          ) : (
            <PlanCard
              onClick={() => handleOnPlanSelected(priceSelected)}
              isCurrentPlan={isCurrentPlan}
              capacity={bytesToString(priceSelected?.bytes ?? 0)}
              currency={
                priceSelected?.currency
                  ? currencyService.getCurrencySymbol(priceSelected?.currency)
                  : translate('preferences.account.plans.freeForever')
              }
              price={priceSelected ? displayAmount(priceSelected.amount) : '0'}
              billing={
                priceSelected ? translate(`preferences.account.plans.${priceSelected.interval}`).toLowerCase() : ''
              }
              changePlanType={currentChangePlanType}
              isLoading={isLoadingCheckout}
              disableActionButton={false}
              isBusiness={isBusinessPlan}
            />
          )}
        </>
      ) : (
        <InfoPlanCardSkeleton />
      )}
    </>
  );
};
