import { loadStripe, SetupIntentResult, Stripe } from '@stripe/stripe-js';
import envService from 'app/core/services/env.service';

let stripe: Stripe;

// const getStripe = async () => {

// };

async function paypalSetupIntent(setupIntentId: string): Promise<SetupIntentResult> {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
    )) as Stripe;
  }
  await localStorage.setItem('setupIntentId', setupIntentId);

  return await stripe.confirmPayPalSetup(setupIntentId, {
    return_url: `${window.location.origin}/payment-method`,
    mandate_data: {
      customer_acceptance: {
        type: 'online',
        online: {
          infer_from_client: true,
        },
      },
    },
  });
}

async function retrieveSetupIntent(setupIntentId: string): Promise<SetupIntentResult> {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
    )) as Stripe;
  }
  return await stripe.retrieveSetupIntent(setupIntentId);
}

export const stripeService = {
  paypalSetupIntent,
  retrieveSetupIntent,
};
