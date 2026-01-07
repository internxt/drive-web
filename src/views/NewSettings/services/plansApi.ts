import { Stripe, loadStripe } from '@stripe/stripe-js';
import envService from 'services/env.service';
import { paymentService, currencyService } from 'views/Checkout/services';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { userLocation } from 'utils/userLocation';

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
    const currencyValue = currencyService.getCurrencyForLocation(location);

    return getPlanPrices({ currencyValue, userType });
  } catch {
    // by default in euros
    return getPlanPrices({ currencyValue: 'eur', userType });
  }
};

const getStripe = async (stripe): Promise<Stripe> => {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction()
        ? envService.getVariable('stripePublicKey')
        : envService.getVariable('stripeTestPublicKey'),
    )) as Stripe;
  }

  return stripe;
};

export { fetchPlanPrices, getStripe };
