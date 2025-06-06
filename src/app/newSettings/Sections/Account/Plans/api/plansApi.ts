import { Stripe, loadStripe } from '@stripe/stripe-js';
import envService, { envConfig } from '../../../../../core/services/env.service';
import paymentService from '../../../../../payment/services/payment.service';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { userLocation } from 'app/utils/userLocation';

const productValue = {
  US: 'usd',
  CA: 'usd',
};

const getPlanPrices = async ({
  currencyValue = 'eur',
  userType = UserType.Individual,
}: {
  currencyValue: string;
  userType: UserType;
}) => paymentService.getPrices(currencyValue, userType);

const fetchPlanPrices = async (userType: UserType) => {
  try {
    const { location } = await userLocation();
    const currencyValue = productValue[location] ?? 'eur';

    return getPlanPrices({ currencyValue, userType });
  } catch {
    // by default in euros
    return getPlanPrices({ currencyValue: 'eur', userType });
  }
};

const getStripe = async (stripe): Promise<Stripe> => {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? envConfig.stripe.publicKey : envConfig.stripe.testPublicKey,
    )) as Stripe;
  }

  return stripe;
};

export { fetchPlanPrices, getStripe };
