import { Stripe, StripeElements } from '@stripe/stripe-js';
import { CreateSubscriptionPayload, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { savePaymentDataInLocalStorage } from 'app/analytics/impact.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import checkoutService from '../services/checkout.service';
import { useStripeConfirmation } from './useStripeConfirmation';
import { CouponCodeData } from '../types';

interface SubscriptionPaymentParams {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  quantity?: number;
  captchaToken: string;
  promoCodeId?: string;
  selectedPlan: PriceWithTax;
  couponCodeData?: CouponCodeData;
  elements: StripeElements;
  confirmPayment: Stripe['confirmPayment'];
  confirmSetupIntent: Stripe['confirmSetup'];
  translate: (key: string) => string;
}

interface SubscriptionIntentResponse {
  type: string;
  clientSecret: string;
  subscriptionId?: string;
  paymentIntentId?: string;
}

export const useSubscriptionPayment = () => {
  const { confirmPaymentIntent, confirmSetupIntent } = useStripeConfirmation();

  const createSubscriptionIntent = async ({
    customerId,
    priceId,
    token,
    currency,
    quantity = 1,
    captchaToken,
    promoCodeId,
  }: CreateSubscriptionPayload): Promise<SubscriptionIntentResponse> => {
    const response = await checkoutService.createSubscription({
      customerId,
      priceId,
      token,
      currency,
      captchaToken,
      promoCodeId,
      quantity,
    });

    return {
      type: response.type,
      clientSecret: response.clientSecret,
      subscriptionId: response.subscriptionId,
      paymentIntentId: response.paymentIntentId,
    };
  };

  const processSubscriptionPayment = async ({
    customerId,
    priceId,
    token,
    currency,
    quantity = 1,
    captchaToken,
    promoCodeId,
    selectedPlan,
    couponCodeData,
    elements,
    confirmPayment,
    confirmSetupIntent: confirmSetup,
    translate,
  }: SubscriptionPaymentParams): Promise<void> => {
    const subscription = await createSubscriptionIntent({
      customerId,
      priceId,
      token,
      currency,
      quantity,
      captchaToken,
      promoCodeId,
    });

    savePaymentDataInLocalStorage(
      subscription.subscriptionId,
      subscription.paymentIntentId,
      selectedPlan,
      quantity,
      couponCodeData,
    );

    switch (subscription.type) {
      case 'payment':
        await confirmPaymentIntent({
          elements,
          clientSecret: subscription.clientSecret,
          confirmPayment,
        });
        break;

      case 'setup':
        await confirmSetupIntent({
          elements,
          clientSecret: subscription.clientSecret,
          confirmSetup,
        });
        break;

      default:
        notificationsService.show({
          text: translate('notificationMessages.errorCreatingSubscription'),
          type: ToastType.Error,
        });
        break;
    }
  };

  return {
    createSubscriptionIntent,
    processSubscriptionPayment,
  };
};
