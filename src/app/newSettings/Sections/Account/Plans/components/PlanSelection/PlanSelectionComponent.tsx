import { DisplayPrice, UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import PlanSelectionCard from './PlanSelectionCard';
import { bytesToString } from 'app/drive/services/size.service';
import { displayAmount } from '../../utils/planUtils';
import { PlanSelectionCardSkeleton } from './skeletons/PlanSelectionCardSkeleton';
import currencyService from 'app/payment/services/currency.service';

export interface UserSubscriptionProps {
  individual: UserSubscription | null;
  business: UserSubscription | null;
}

interface PlanSelectionComponentProps {
  pricesToRender: DisplayPrice[];
  priceSelected: DisplayPrice;
  freePlanData: DisplayPrice;
  showFreePriceCard: boolean;
  userSubscription: UserSubscriptionProps;
  subscriptionSelected: {
    individual: boolean;
    business: boolean;
  };
  translate: (key: string, props?: Record<string, unknown>) => string;
  onPriceSelected: (plan) => void;
}

export const PlanSelectionComponent = ({
  pricesToRender,
  userSubscription,
  freePlanData,
  priceSelected,
  subscriptionSelected,
  showFreePriceCard,
  translate,
  onPriceSelected,
}: PlanSelectionComponentProps) => {
  const TOTAL_SKELETON_ITEMS = {
    INDIVIDUAL: 5,
    BUSINESS: 2,
  };

  const skeletonItems = subscriptionSelected.individual
    ? TOTAL_SKELETON_ITEMS.INDIVIDUAL
    : TOTAL_SKELETON_ITEMS.BUSINESS;

  return (
    <div className="flex flex-1 flex-col items-stretch space-y-2.5">
      {pricesToRender.length > 0 ? (
        <>
          {showFreePriceCard && (
            <PlanSelectionCard
              key={freePlanData.id}
              onClick={() => onPriceSelected(freePlanData)}
              isSelected={priceSelected?.id === freePlanData.id}
              capacity={bytesToString(freePlanData.bytes)}
              currency={freePlanData.currency}
              amount={''}
              billing={''}
              isCurrentPlan={freePlanData.id === userSubscription.individual?.type}
            />
          )}
          {pricesToRender.map((plan) => (
            <PlanSelectionCard
              key={plan.id}
              onClick={() => onPriceSelected(plan)}
              isSelected={priceSelected?.id === plan.id}
              capacity={bytesToString(plan.bytes)}
              currency={currencyService.getCurrencySymbol(plan.currency.toUpperCase())}
              amount={displayAmount(plan.amount, plan.interval === 'lifetime' ? 0 : 2)}
              billing={
                plan.interval === 'lifetime'
                  ? translate('views.account.tabs.plans.card.oneTimePayment')
                  : translate(`preferences.account.plans.${plan.interval}`)?.toLowerCase()
              }
              isCurrentPlan={
                subscriptionSelected.individual
                  ? userSubscription.individual?.type === 'subscription' &&
                    userSubscription.individual?.priceId === plan.id
                  : userSubscription.business?.type === 'subscription' && userSubscription.business?.priceId === plan.id
              }
              displayBillingSlash={plan.interval !== 'lifetime'}
              isBusiness={subscriptionSelected.business}
            />
          ))}
        </>
      ) : (
        new Array(skeletonItems).fill(0).map((_, index) => <PlanSelectionCardSkeleton key={index} />)
      )}
    </div>
  );
};
