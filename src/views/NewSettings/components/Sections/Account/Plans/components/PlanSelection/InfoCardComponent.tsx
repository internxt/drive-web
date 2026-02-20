import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types/types';
import PlanCard, { ChangePlanType } from '../PlanCard';
import { bytesToString } from 'app/drive/services/size.service';
import { currencyService } from 'views/Checkout/services';
import { displayAmount } from '../../../../../../utils/planUtils';
import { InfoPlanCardSkeleton } from './skeletons/InfoPlanCardSkeleton';

interface InfoCardComponentProps {
  pricesToRender: DisplayPrice[];
  priceSelected: DisplayPrice;
  freePlanData: DisplayPrice;
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
  onCancelSubscription,
  handleOnPlanSelected,
  translate,
}: InfoCardComponentProps) => {
  const isPriceData = priceSelected?.id === freePlanData.id;
  const getPriceAmount = (priceSelected) => {
    if (!priceSelected) return 0;

    const { amount } = priceSelected;

    return amount;
  };

  const getCurrencySymbol = (priceSelected) => {
    if (!priceSelected?.currency) {
      return translate('preferences.account.plans.freeForever');
    }

    return currencyService.getCurrencySymbol(priceSelected.currency);
  };

  const showBilling = priceSelected.interval !== 'lifetime';

  const price = priceSelected ? displayAmount(getPriceAmount(priceSelected)).replace(/\.00$/, '') : '0';

  const currency = getCurrencySymbol(priceSelected);

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
              changePlanType={currentChangePlanType}
              isLoading={isLoadingCheckout}
              disableActionButton={false}
            />
          ) : (
            <PlanCard
              onClick={() => handleOnPlanSelected(priceSelected)}
              isCurrentPlan={isCurrentPlan}
              capacity={bytesToString(priceSelected?.bytes ?? 0)}
              currency={currency}
              price={price}
              showBilling={showBilling}
              changePlanType={currentChangePlanType}
              isLoading={isLoadingCheckout}
              disableActionButton={false}
            />
          )}
        </>
      ) : (
        <InfoPlanCardSkeleton />
      )}
    </>
  );
};
