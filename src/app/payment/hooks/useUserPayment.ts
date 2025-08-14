import { Stripe, StripeElements } from '@stripe/stripe-js';

import { savePaymentDataInLocalStorage } from '../../analytics/impact.service';
import checkoutService from '../services/checkout.service';
import envService from '../../core/services/env.service';
import { sendConversionToAPI } from '../../analytics/googleSheet.service';
import navigationService from '../../core/services/navigation.service';
import { AppView } from '../../core/types';
import {
  CreatePaymentIntentPayload,
  InvoiceStatus,
  PlanInterval,
  ProcessPurchasePayload,
  UseUserPaymentPayload,
} from '../types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

export const useUserPayment = () => {
  const getSubscriptionPaymentIntent = async ({
    customerId,
    priceId,
    token,
    currency,
    seatsForBusinessSubscription,
    promoCodeId,
  }: CreatePaymentIntentPayload) => {
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
  };

  const getLifetimePaymentIntent = async ({
    customerId,
    priceId,
    currency,
    token,
    promoCodeId,
  }: CreatePaymentIntentPayload) => {
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

  const confirmStripeSetupIntent = async (
    elements: StripeElements,
    clientSecret: string,
    setupIntent: Stripe['confirmSetup'],
  ) => {
    const RETURN_URL_DOMAIN = envService.getVariable('hostname');
    const { error: confirmIntentError } = await setupIntent({
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
    currency,
    seatsForBusinessSubscription = 1,
    currentSelectedPlan,
    couponCodeData,
    elements,
    translate,
    confirmPayment,
    confirmSetupIntent,
  }: ProcessPurchasePayload) => {
    const subscription = await getSubscriptionPaymentIntent({
      customerId,
      priceId,
      token,
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

    switch (subscription.type) {
      case 'payment':
        await confirmStripePaymentIntent(elements, subscription.clientSecret, confirmPayment);
        break;

      case 'setup':
        await confirmStripeSetupIntent(elements, subscription.clientSecret, confirmSetupIntent);
        break;

      default:
        notificationsService.show({
          text: translate('notificationMessages.errorCreatingSubscription'),
          type: ToastType.Error,
        });
        break;
    }
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
  }: ProcessPurchasePayload) => {
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
    customerId,
    priceId,
    currency,
    couponCodeData,
    elements,
    gclidStored,
    seatsForBusinessSubscription = 1,
    translate,
    confirmPayment,
    confirmSetupIntent,
  }: UseUserPaymentPayload) => {
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
          priceId,
          token,
          couponCodeData,
          seatsForBusinessSubscription,
          translate,
          confirmPayment,
          confirmSetupIntent,
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
          translate,
          confirmPayment,
          confirmSetupIntent,
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
    getSubscriptionPaymentIntent,
    getLifetimePaymentIntent,
    handleSubscriptionPayment,
    handleLifetimePayment,
    handleUserPayment,
  };
};
