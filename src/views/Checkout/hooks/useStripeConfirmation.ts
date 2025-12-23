import { Stripe, StripeElements } from '@stripe/stripe-js';
import envService from 'services/env.service';

interface ConfirmPaymentParams {
  elements: StripeElements;
  clientSecret: string;
  confirmPayment: Stripe['confirmPayment'];
  returnPath?: string;
}

interface ConfirmSetupParams {
  elements: StripeElements;
  clientSecret: string;
  confirmSetup: Stripe['confirmSetup'];
  returnPath?: string;
}

export const useStripeConfirmation = () => {
  const getReturnUrl = (path: string) => {
    const domain = envService.getVariable('hostname');
    return `${domain}${path}`;
  };

  const confirmPaymentIntent = async ({
    elements,
    clientSecret,
    confirmPayment,
    returnPath = '/checkout/success',
  }: ConfirmPaymentParams): Promise<void> => {
    const { error } = await confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: getReturnUrl(returnPath),
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const confirmSetupIntent = async ({
    elements,
    clientSecret,
    confirmSetup,
    returnPath = '/checkout/success',
  }: ConfirmSetupParams): Promise<void> => {
    const { error } = await confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: getReturnUrl(returnPath),
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  return {
    confirmPaymentIntent,
    confirmSetupIntent,
    getReturnUrl,
  };
};
