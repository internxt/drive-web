import { DisplayPrice, UserSubscription } from '@internxt/sdk/dist/drive/payments/types/types';
import PlanSelectionCard from './PlanSelectionCard';
import { bytesToString } from 'app/drive/services/size.service';
import { displayAmount } from '../../../../../../utils/planUtils';
import { PlanSelectionCardSkeleton } from './skeletons/PlanSelectionCardSkeleton';
import { currencyService } from 'views/Checkout/services';

export interface UserSubscriptionProps {
  individual: UserSubscription | null;
  business: UserSubscription | null;
}

interface PlanSelectionComponentProps {
  pricesToRender: DisplayPrice[];
  priceSelected: DisplayPrice;
  freePlanData: DisplayPrice;
  showFreePriceCard: boolean;
  isFreePlan: boolean;
  subscriptionSelected: {
    individual: boolean;
    business: boolean;
  };
  isCurrentSubscriptionPlan: (plan: DisplayPrice) => boolean;
  translate: (key: string, props?: Record<string, unknown>) => string;
  onPriceSelected: (plan) => void;
}

export const PlanSelectionComponent = ({
  pricesToRender,
  freePlanData,
  priceSelected,
  subscriptionSelected,
  showFreePriceCard,
  isFreePlan,
  isCurrentSubscriptionPlan,
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

  const skeletonKeys = Array.from({ length: skeletonItems }, (_, i) => `plan-skeleton-${i}`);

  return (
    <div className="flex flex-1 flex-col items-stretch space-y-2.5">
      {pricesToRender.length > 0 ? (
        <>
          {pricesToRender.map((plan) => (
            <PlanSelectionCard
              key={plan.id}
              onClick={() => onPriceSelected(plan)}
              isSelected={priceSelected?.id === plan.id}
              capacity={bytesToString(plan.bytes)}
              currency={currencyService.getCurrencySymbol(plan.currency.toUpperCase())}
              amount={displayAmount(plan.interval === 'year' ? plan.amount / 12 : plan.amount).replace(/\.00$/, '')}
              billing={plan.interval === 'lifetime' ? '' : translate('preferences.account.plans.month')?.toLowerCase()}
              isCurrentPlan={isCurrentSubscriptionPlan(plan)}
              displayBillingSlash={plan.interval !== 'lifetime'}
              isBusiness={subscriptionSelected.business}
            />
          ))}
          {showFreePriceCard && (
            <PlanSelectionCard
              key={freePlanData.id}
              onClick={() => onPriceSelected(freePlanData)}
              isSelected={priceSelected?.id === freePlanData.id}
              capacity={bytesToString(freePlanData.bytes)}
              currency={freePlanData.currency}
              amount={''}
              billing={''}
              isCurrentPlan={isFreePlan}
            />
          )}
        </>
      ) : (
        skeletonKeys.map((key) => <PlanSelectionCardSkeleton key={key} />)
      )}
    </div>
  );
};
