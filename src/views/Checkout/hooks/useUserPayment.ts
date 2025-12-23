import { Stripe, StripeElements } from '@stripe/stripe-js';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { sendConversionToAPI } from 'app/analytics/googleSheet.service';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import notificationsService from 'app/notifications/services/notifications.service';
import { ActionDialog, DialogActionConfig } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import { useSubscriptionPayment } from './useSubscriptionPayment';
import { useLifetimePayment } from './useLifetimePayment';
import { CouponCodeData, PlanInterval } from '../types';

interface UseUserPaymentParams {
  selectedPlan: PriceWithTax;
  token: string;
  customerId: string;
  priceId: string;
  currency: string;
  couponCodeData?: CouponCodeData;
  elements: StripeElements;
  gclidStored?: string;
  seatsForBusinessSubscription?: number;
  captchaToken: string;
  userAddress: string;
  translate: (key: string) => string;
  confirmPayment: Stripe['confirmPayment'];
  confirmSetupIntent: Stripe['confirmSetup'];
  openCryptoPaymentDialog?: (key: ActionDialog, config?: DialogActionConfig) => void;
}

export const useUserPayment = () => {
  const { processSubscriptionPayment } = useSubscriptionPayment();
  const { processLifetimePayment } = useLifetimePayment();

  const trackConversion = async ({
    gclidStored,
    selectedPlan,
    currency,
    seatsForBusinessSubscription,
    couponCodeData,
  }: {
    gclidStored: string;
    selectedPlan: PriceWithTax;
    currency: string;
    seatsForBusinessSubscription: number;
    couponCodeData?: CouponCodeData;
  }) => {
    await sendConversionToAPI({
      gclid: gclidStored,
      name: `Checkout - ${selectedPlan.price.type}`,
      value: selectedPlan,
      currency,
      timestamp: new Date(),
      users: seatsForBusinessSubscription,
      couponCodeData,
    });
  };

  const handleUserPayment = async ({
    selectedPlan,
    token,
    customerId,
    priceId,
    currency,
    couponCodeData,
    elements,
    gclidStored,
    seatsForBusinessSubscription = 1,
    captchaToken,
    userAddress,
    translate,
    confirmPayment,
    confirmSetupIntent,
    openCryptoPaymentDialog,
  }: UseUserPaymentParams): Promise<void> => {
    const planInterval = selectedPlan.price.interval;

    if (gclidStored) {
      await trackConversion({
        gclidStored,
        selectedPlan,
        currency,
        seatsForBusinessSubscription,
        couponCodeData,
      });
    }

    switch (planInterval) {
      case PlanInterval.MONTH:
      case PlanInterval.YEAR:
        await processSubscriptionPayment({
          customerId,
          priceId,
          token,
          currency,
          quantity: seatsForBusinessSubscription,
          captchaToken,
          promoCodeId: couponCodeData?.codeId,
          selectedPlan,
          couponCodeData,
          elements,
          confirmPayment,
          confirmSetupIntent,
          translate,
        });
        break;

      case PlanInterval.LIFETIME:
        await processLifetimePayment({
          customerId,
          priceId,
          token,
          currency,
          userAddress,
          captchaToken,
          selectedPlan,
          couponCodeData,
          elements,
          confirmPayment,
          openCryptoPaymentDialog,
        });
        break;

      default:
        notificationsService.show({
          text: translate('checkout.error.invalidPlan'),
        });
        navigationService.push(AppView.Drive);
        break;
    }
  };

  return {
    handleUserPayment,
  };
};
