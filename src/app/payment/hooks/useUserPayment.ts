import { Stripe, StripeElements } from '@stripe/stripe-js';

import { savePaymentDataInLocalStorage } from '../../analytics/impact.service';
import checkoutService from '../services/checkout.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { CouponCodeData } from '../types';
import envService from '../../core/services/env.service';
import { sendConversionToAPI } from '../../analytics/googleSheet.service';
import navigationService from '../../core/services/navigation.service';
import { AppView } from '../../core/types';
import paymentService from '../services/payment.service';

interface CommonPaymentIntentPayload {
  customerId: string;
  priceId: string;
  currency: string;
  token: string;
  promoCodeId?: string;
}

interface GetSubscriptionPaymentIntentPayload extends CommonPaymentIntentPayload {
  mobileToken: string | null;
  seatsForBusinessSubscription?: number;
}

interface CommonPaymentHandlerPayload {
  elements: StripeElements;
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  currentSelectedPlan: PriceWithTax;
  couponCodeData?: CouponCodeData;
  confirmPayment: Stripe['confirmPayment'];
}

interface HandleSubscriptionPaymentPayload extends CommonPaymentHandlerPayload {
  seatsForBusinessSubscription?: number;
  mobileToken: string | null;
}

export interface HandleUserPaymentPayload {
  selectedPlan: PriceWithTax;
  token: string;
  customerId: string;
  priceId: string;
  currency: string;
  elements: StripeElements;
  mobileToken: string | null;
  gclidStored: string | null;
  couponCodeData?: CouponCodeData;
  seatsForBusinessSubscription?: number;
  confirmPayment: Stripe['confirmPayment'];
}

enum PlanInterval {
  YEAR = 'year',
  LIFETIME = 'lifetime',
}

enum InvoiceStatus {
  PAID = 'paid',
}

export const useUserPayment = () => {
  const getSubscriptionPaymentIntent = async ({
    customerId,
    priceId,
    token,
    mobileToken,
    currency,
    seatsForBusinessSubscription,
    promoCodeId,
  }: GetSubscriptionPaymentIntentPayload) => {
    if (mobileToken) {
      const {
        type: paymentType,
        clientSecret: client_secret,
        subscriptionId,
        paymentIntentId,
      } = await paymentService.createSubscriptionWithTrial(customerId, priceId, token, mobileToken, currency);

      return {
        clientSecretType: paymentType,
        clientSecret: client_secret,
        subscriptionId,
        paymentIntentId,
      };
    } else {
      const {
        type: paymentType,
        clientSecret: client_secret,
        subscriptionId,
        paymentIntentId,
      } = await checkoutService.createSubscription({
        customerId,
        priceId,
        token,
        currency,
        promoCodeId,
        quantity: seatsForBusinessSubscription,
      });

      return {
        type: paymentType,
        clientSecret: client_secret,
        subscriptionId,
        paymentIntentId,
      };
    }
  };

  const getLifetimePaymentIntent = async ({
    customerId,
    priceId,
    currency,
    token,
    promoCodeId,
  }: CommonPaymentIntentPayload) => {
    const paymentIntentResponse = await checkoutService.createPaymentIntent({
      customerId,
      priceId,
      currency,
      token,
      promoCodeId: promoCodeId,
    });

    const { clientSecret, invoiceStatus, id } = paymentIntentResponse;
    return {
      clientSecret,
      invoiceStatus,
      paymentIntentId: id,
    };
  };

  const confirmStripePaymentIntent = async (
    elements: StripeElements,
    clientSecret: string,
    confirmPayment: Stripe['confirmPayment'],
  ) => {
    const RETURN_URL_DOMAIN = envService.getVariable('hostname');
    const { error: confirmIntentError } = await confirmPayment({
      elements,
      clientSecret: clientSecret,
      confirmParams: {
        return_url: `${RETURN_URL_DOMAIN}/checkout/success`,
      },
    });

    if (confirmIntentError) {
      throw new Error(confirmIntentError.message);
    }
  };

  const handleSubscriptionPayment = async ({
    customerId,
    priceId,
    token,
    mobileToken,
    currency,
    seatsForBusinessSubscription = 1,
    currentSelectedPlan,
    couponCodeData,
    elements,
    confirmPayment,
  }: HandleSubscriptionPaymentPayload) => {
    const subscription = await getSubscriptionPaymentIntent({
      customerId,
      priceId,
      token,
      mobileToken,
      seatsForBusinessSubscription,
      promoCodeId: couponCodeData?.codeId,
      currency,
    });

    savePaymentDataInLocalStorage(
      subscription.subscriptionId,
      subscription.paymentIntentId,
      currentSelectedPlan,
      seatsForBusinessSubscription,
      couponCodeData,
    );

    await confirmStripePaymentIntent(elements, subscription.clientSecret, confirmPayment);
  };

  const handleLifetimePayment = async ({
    customerId,
    priceId,
    token,
    currency,
    currentSelectedPlan,
    couponCodeData,
    elements,
    confirmPayment,
  }: CommonPaymentHandlerPayload) => {
    const invoice = await getLifetimePaymentIntent({
      customerId,
      priceId,
      token,
      promoCodeId: couponCodeData?.codeId,
      currency,
    });

    savePaymentDataInLocalStorage(undefined, invoice.paymentIntentId, currentSelectedPlan, 1, couponCodeData);

    // !DO NOT REMOVE THIS
    // If there is a one time payment with a 100% OFF coupon code, the invoice will be marked as 'paid' by Stripe and
    // no client secret will be provided.
    if (invoice.invoiceStatus && invoice.invoiceStatus === InvoiceStatus.PAID) {
      navigationService.push(AppView.CheckoutSuccess);
      return;
    }

    await confirmStripePaymentIntent(elements, invoice.clientSecret, confirmPayment);
  };

  const handleUserPayment = async ({
    selectedPlan,
    token,
    mobileToken,
    customerId,
    priceId,
    currency,
    couponCodeData,
    elements,
    gclidStored,
    seatsForBusinessSubscription = 1,
    confirmPayment,
  }: HandleUserPaymentPayload) => {
    if (gclidStored) {
      await sendConversionToAPI({
        gclid: gclidStored,
        name: `Checkout - ${selectedPlan.price.type}`,
        value: selectedPlan,
        currency,
        timestamp: new Date(),
        users: seatsForBusinessSubscription,
        couponCodeData: couponCodeData,
      });
    }

    switch (selectedPlan.price.interval) {
      case PlanInterval.YEAR:
        await handleSubscriptionPayment({
          currency,
          currentSelectedPlan: selectedPlan,
          customerId,
          elements,
          mobileToken,
          priceId,
          token,
          couponCodeData,
          seatsForBusinessSubscription,
          confirmPayment,
        });
        break;

      case PlanInterval.LIFETIME:
        await handleLifetimePayment({
          currency,
          currentSelectedPlan: selectedPlan,
          customerId,
          elements,
          priceId,
          token,
          couponCodeData,
          confirmPayment,
        });
        break;

      default:
        console.warn('Unsupported plan interval: ', selectedPlan.price.interval);
        navigationService.push(AppView.Drive);
        break;
    }
  };

  return {
    getSubscriptionPaymentIntent,
    getLifetimePaymentIntent,
    handleSubscriptionPayment,
    handleLifetimePayment,
    handleUserPayment,
  };
};
