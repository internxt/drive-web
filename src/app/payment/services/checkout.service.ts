import paymentService from 'app/payment/services/payment.service';
import { ClientSecretData, CouponCodeData, PlanData } from '../types';

const fetchPlanById = async (planId: string): Promise<PlanData> => {
  const response = await fetch(`${process.env.REACT_APP_PAYMENTS_API_URL}/plan-by-id?planId=${planId}`, {
    method: 'GET',
  });

  if (response.status !== 200) {
    throw new Error('Plan not found');
  }

  const data = await response.json();

  return data;
};

const fetchPromotionCodeByName = async (promotionCodeName: string): Promise<CouponCodeData> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/promo-code-by-name?promotionCode=${promotionCodeName}`,
  );

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(message);
  }

  const dataJson = await response.json();

  return {
    codeId: dataJson.codeId,
    codeName: promotionCodeName,
    amountOff: dataJson.amountOff,
    percentOff: dataJson.percentOff,
  };
};

const getClientSecretForPaymentIntent = async (
  customerId: string,
  amount: number,
  planId: string,
  token: string,
  promoCode?: string,
): Promise<ClientSecretData> => {
  const { clientSecret: client_secret } = await paymentService.createPaymentIntent(
    customerId,
    amount,
    planId,
    token,
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
  token: string,
  promoCodeId?: string,
): Promise<ClientSecretData> => {
  const { type: paymentType, clientSecret: client_secret } = await paymentService.createSubscription(
    customerId,
    priceId,
    token,
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
