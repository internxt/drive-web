import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import paymentService from 'app/payment/services/payment.service';
import { ClientSecretObj } from '../types';

const fetchPlanById = async (planId: string): Promise<DisplayPrice> => {
  const response = await fetch(`${process.env.REACT_APP_PAYMENTS_API_URL}/plan-by-id?planId=${planId}`, {
    method: 'GET',
  });

  if (response.status !== 200) {
    navigationService.push(AppView.Drive);
  }

  return response.json();
};

const getClientSecretForPaymentIntent = async (
  customerId: string,
  amount: number,
  planId: string,
  promoCode?: string,
): Promise<ClientSecretObj> => {
  const { clientSecret: client_secret } = await paymentService.createPaymentIntent(
    customerId,
    amount,
    planId,
    promoCode,
  );

  return {
    clientSecretType: 'payment',
    client_secret,
  };
};

const getClientSecretForSubscriptionIntent = async (
  customerId: string,
  priceId: string,
  promoCode?: string,
): Promise<ClientSecretObj> => {
  const { type: paymentType, clientSecret: client_secret } = await paymentService.createSubscription(
    customerId,
    priceId,
    promoCode,
  );

  return {
    clientSecretType: paymentType,
    client_secret,
  };
};

const checkoutService = {
  fetchPlanById,
  getClientSecretForPaymentIntent,
  getClientSecretForSubscriptionIntent,
};

export default checkoutService;
