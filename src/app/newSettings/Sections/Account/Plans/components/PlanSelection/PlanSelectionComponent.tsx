import { DisplayPrice, UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import PlanSelectionCard from './PlanSelectionCard';
import { FreeStoragePlan } from 'app/drive/types';
import { bytesToString } from 'app/drive/services/size.service';
import { displayAmount } from '../../utils/planUtils';
import { PlanSelectionCardSkeleton } from './PlanSelectionCardSkeleton';
import currencyService from 'app/payment/services/currency.service';

interface PlanSelectionComponentProps {
  pricesToRender: DisplayPrice[];
  showFreePriceCard: boolean;
  priceSelected: DisplayPrice;
  userSubscription: {
    individual: UserSubscription | null;
    business: UserSubscription | null;
  };
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
  priceSelected,
  subscriptionSelected,
  showFreePriceCard,
  translate,
  onPriceSelected,
}: PlanSelectionComponentProps) => {
  const FREE_PLAN_DATA = {
    amount: 0,
    bytes: FreeStoragePlan.storageLimit,
    id: 'free',
    currency: translate('preferences.account.plans.freeForever'),
    interval: 'month',
  } as DisplayPrice;
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
              key={FREE_PLAN_DATA.id}
              onClick={() => onPriceSelected(FREE_PLAN_DATA)}
              isSelected={priceSelected?.id === FREE_PLAN_DATA.id}
              capacity={bytesToString(FREE_PLAN_DATA.bytes)}
              currency={FREE_PLAN_DATA.currency}
              amount={''}
              billing={''}
              isCurrentPlan={FREE_PLAN_DATA.id === userSubscription.individual?.type}
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
