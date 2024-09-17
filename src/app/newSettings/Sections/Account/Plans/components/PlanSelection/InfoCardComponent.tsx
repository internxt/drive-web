import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import PlanCard, { ChangePlanType } from '../PlanCard';
import { bytesToString } from 'app/drive/services/size.service';
import { UserSubscriptionProps } from './PlanSelectionComponent';
import currencyService from 'app/payment/services/currency.service';
import { displayAmount } from '../../utils/planUtils';
import { InfoPlanCardSkeleton } from './skeletons/InfoPlanCardSkeleton';

interface InfoCardComponentProps {
  pricesToRender: DisplayPrice[];
  priceSelected: DisplayPrice;
  freePlanData: DisplayPrice;
  subscriptionSelected: {
    individual: boolean;
    business: boolean;
  };
  userSubscription: UserSubscriptionProps;
  currentChangePlanType: ChangePlanType;
  isCurrentFreePlan: boolean;
  onCancelSubscription: (cancelSubscription: boolean) => void;
  handleOnPlanSelected: (priceSelected: DisplayPrice) => void;
  isLoadingCheckout: boolean;
  translate: (key: string, props?: Record<string, unknown>) => string;
}

export const InfoCardComponent = ({
  pricesToRender,
  priceSelected,
  isCurrentFreePlan,
  freePlanData,
  subscriptionSelected,
  userSubscription,
  currentChangePlanType,
  isLoadingCheckout,
  onCancelSubscription,
  handleOnPlanSelected,
  translate,
}: InfoCardComponentProps) => {
  return (
    <>
      {pricesToRender.length > 0 ? (
        <>
          {priceSelected?.id === freePlanData.id ? (
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
              isCurrentPlan={
                subscriptionSelected.individual
                  ? userSubscription.individual?.type === 'subscription' &&
                    userSubscription.individual?.priceId === priceSelected.id
                  : userSubscription.business?.type === 'subscription' &&
                    userSubscription.business?.priceId === priceSelected.id
              }
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
              isBusiness={subscriptionSelected.business}
            />
          )}
        </>
      ) : (
        <InfoPlanCardSkeleton />
      )}
    </>
  );
};
