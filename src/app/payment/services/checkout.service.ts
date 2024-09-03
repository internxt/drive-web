import paymentService from '../../payment/services/payment.service';
import { ClientSecretData, CouponCodeData, CurrentPlanSelected, PlanData } from '../types';

const fetchPlanById = async (priceId: string, currency?: string): Promise<PlanData> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/plan-by-id?planId=${priceId}&currency=${currency}`,
    {
      method: 'GET',
    },
  );

  if (response.status !== 200) {
    throw new Error('Plan not found');
  }

  const data = await response.json();

  return data;
};

const fetchPromotionCodeByName = async (priceId: string, promotionCodeName: string): Promise<CouponCodeData> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/promo-code-by-name?priceId=${priceId}&promotionCode=${promotionCodeName}`,
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
  currency: string,
  promoCode?: string,
): Promise<ClientSecretData & { paymentIntentId: string }> => {
  const { clientSecret: client_secret, id } = await paymentService.createPaymentIntent(
    customerId,
    amount,
    planId,
    token,
    currency,
    promoCode,
  );

  return {
    clientSecretType: 'payment',
    client_secret,
    paymentIntentId: id,
  };
};

const getClientSecretForSubscriptionIntent = async (
  customerId: string,
  priceId: string,
  token: string,
  currency: string,
  promoCodeId?: string,
): Promise<ClientSecretData & { subscriptionId?: string; paymentIntentId?: string }> => {
  const {
    type: paymentType,
    clientSecret: client_secret,
    subscriptionId,
    paymentIntentId,
  } = await paymentService.createSubscription(customerId, priceId, token, currency, promoCodeId);

  return {
    clientSecretType: paymentType,
    client_secret,
    subscriptionId,
    paymentIntentId,
  };
};

const getClientSecret = async (
  selectedPlan: CurrentPlanSelected,
  token: string,
  customerId: string,
  promoCodeId?: CouponCodeData['codeId'],
) => {
  if (selectedPlan?.interval === 'lifetime') {
    const { clientSecretType, client_secret, paymentIntentId } = await checkoutService.getClientSecretForPaymentIntent(
      customerId,
      selectedPlan.amount,
      selectedPlan.id,
      token,
      selectedPlan.currency,
      promoCodeId,
    );

    return {
      type: clientSecretType,
      clientSecret: client_secret,
      paymentIntentId,
    };
  } else {
    const response = await checkoutService.getClientSecretForSubscriptionIntent(
      customerId,
      selectedPlan?.id,
      token,
      selectedPlan.currency,
      promoCodeId,
    );

    const { clientSecretType, client_secret, subscriptionId, paymentIntentId } = response;
    return {
      type: clientSecretType,
      clientSecret: client_secret,
      subscriptionId,
      paymentIntentId,
    };
  }
};

const checkoutService = {
  fetchPlanById,
  fetchPromotionCodeByName,
  getClientSecretForPaymentIntent,
  getClientSecretForSubscriptionIntent,
  getClientSecret,
};

export default checkoutService;
