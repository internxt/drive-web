import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types/types';
import PlanCard, { ChangePlanType } from '../PlanCard';
import { bytesToString } from 'app/drive/services/size.service';
import currencyService from 'views/Checkout/services/currency.service';
import { displayAmount } from '../../../../../../utils/planUtils';
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
  const getPriceAmount = (priceSelected) => {
    if (!priceSelected) return 0;

    const { interval, amount } = priceSelected;
    if (interval === 'year') {
      return amount / 12;
    }
    return amount;
  };

  const getCurrencySymbol = (priceSelected) => {
    if (!priceSelected?.currency) {
      return translate('preferences.account.plans.freeForever');
    }

    return currencyService.getCurrencySymbol(priceSelected.currency);
  };

  const billing =
    priceSelected.interval === 'lifetime' ? '' : translate('preferences.account.plans.month')?.toLowerCase();

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
              currency={currency}
              price={price}
              billing={billing}
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
