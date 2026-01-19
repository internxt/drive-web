import { envService, localStorageService } from 'services';
import { checkoutService } from '../services';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { PcCloudError } from './utils.errors';

export interface ProcessPcCloudPaymentProps {
  customerId: string;
  selectedPlan: any;
  token: string;
  mobileToken: string;
  stripeSDK: Stripe;
  elements: StripeElements;
}

export const processPcCloudPayment = async ({
  customerId,
  selectedPlan,
  token,
  mobileToken,
  stripeSDK,
  elements,
}: ProcessPcCloudPaymentProps) => {
  const setupIntent = await checkoutService.checkoutSetupIntent(customerId);
  localStorageService.set('customerId', customerId);
  localStorageService.set('token', token);
  localStorageService.set('priceId', selectedPlan.price.id);
  localStorageService.set('customerToken', token);
  localStorageService.set('mobileToken', mobileToken);
  const RETURN_URL_DOMAIN = envService.getVariable('hostname');
  const { error: confirmIntentError } = await stripeSDK.confirmSetup({
    elements,
    clientSecret: setupIntent.clientSecret,
    confirmParams: {
      return_url: `${RETURN_URL_DOMAIN}/checkout/pcCloud-success?mobileToken=${mobileToken}&priceId=${selectedPlan.price.id}`,
    },
  });

  if (confirmIntentError) {
    throw new PcCloudError(confirmIntentError.message);
  }
};
