import { Stripe, loadStripe } from '@stripe/stripe-js';
import envService from '../../../../core/services/env.service';

const getStripe = async (stripe): Promise<Stripe> => {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
    )) as Stripe;
  }

  return stripe;
};

const displayAmount = (amount: number) => {
  return (amount / 100).toFixed(2);
};

export { displayAmount, getStripe };
