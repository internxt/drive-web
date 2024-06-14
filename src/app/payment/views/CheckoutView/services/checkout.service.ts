import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import paymentService from 'app/payment/services/payment.service';
import { ClientSecretData, CouponCodeData } from '../types';

const fetchPlanById = async (planId: string): Promise<DisplayPrice> => {
  const response = await fetch(`${process.env.REACT_APP_PAYMENTS_API_URL}/plan-by-id?planId=${planId}`, {
    method: 'GET',
  });

  if (response.status !== 200) {
    navigationService.push(AppView.Drive);
  }

  return response.json();
};

const fetchPromotionCodeByName = async (promotionCode: string): Promise<CouponCodeData> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/promo-code-by-id?promotionCode=${promotionCode}`,
  );

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
): Promise<ClientSecretData> => {
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
  promoCodeId?: string,
): Promise<ClientSecretData> => {
  const { type: paymentType, clientSecret: client_secret } = await paymentService.createSubscription(
    customerId,
    priceId,
    promoCodeId,
  );

  return {
    clientSecretType: paymentType,
    client_secret,
  };
};

const checkoutService = {
  fetchPlanById,
  fetchPromotionCodeByName,
  getClientSecretForPaymentIntent,
  getClientSecretForSubscriptionIntent,
};

export default checkoutService;
