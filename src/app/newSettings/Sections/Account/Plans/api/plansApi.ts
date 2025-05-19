import { Stripe, loadStripe } from '@stripe/stripe-js';
import envService from '../../../../../core/services/env.service';
import errorService from '../../../../../core/services/error.service';
import paymentService from '../../../../../payment/services/payment.service';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';

const COUNTRY_API = process.env.REACT_APP_COUNTRY_API_URL;
const productValue = {
  US: 'usd',
  CA: 'usd',
};

const getCountry = async () =>
  fetch(`${COUNTRY_API}`, {
    method: 'GET',
  });

const getPlanPrices = async ({
  currencyValue = 'eur',
  userType = UserType.Individual,
}: {
  currencyValue: string;
  userType: UserType;
}) => paymentService.getPrices(currencyValue, userType);

const fetchPlanPrices = async (userType: UserType) => {
  try {
    const { country } = await getCountry().then((res) => res.json());
    const currencyValue = productValue[country] || 'eur';

    return getPlanPrices({ currencyValue, userType });
  } catch (error) {
    const errorCasted = errorService.castError(error);
    errorService.reportError(errorCasted);

    // by default in euros
    return getPlanPrices({ currencyValue: 'eur', userType });
  }
};

const getStripe = async (stripe): Promise<Stripe> => {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
    )) as Stripe;
  }

  return stripe;
};

export { fetchPlanPrices, getStripe };
