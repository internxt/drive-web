import paymentService from 'app/payment/services/payment.service';
import { Action, ClientSecretData, CouponCodeData, PlanData } from '../types';
import { Dispatch } from 'react';

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

const fetchPromotionCodeByName = async (promotionCode: string): Promise<CouponCodeData> => {
  const response = await fetch(
    `${process.env.REACT_APP_PAYMENTS_API_URL}/promo-code-by-name?promotionCode=${promotionCode}`,
  );

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(message);
  }

  const dataJson = await response.json();

  return {
    codeId: dataJson.codeId,
    codeName: promotionCode,
    amountOff: dataJson.amountOff,
    percentOff: dataJson.percentOff,
  };
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

const getUpsellManager = (
  isUpsellSwitchActivated: boolean,
  plan: PlanData | null,
  setIsUpsellSwitchActivated: (isSwitchActivated: boolean) => void,
  dispatchReducer: Dispatch<Action>,
) => {
  return {
    onUpsellSwitchButtonClicked: () => {
      setIsUpsellSwitchActivated(!isUpsellSwitchActivated);
      const planType = isUpsellSwitchActivated ? 'selectedPlan' : 'upsellPlan';
      dispatchReducer({ type: 'SET_CURRENT_PLAN_SELECTED', payload: plan![planType] });
    },
    isUpsellSwitchActivated,
    showUpsellSwitch: !!plan?.upsellPlan,
    amountSaved: plan?.upsellPlan ? (plan?.selectedPlan.amount * 12 - plan?.upsellPlan.amount) / 100 : undefined,
    amount: plan?.upsellPlan.decimalAmount,
  };
};

const checkoutService = {
  fetchPlanById,
  fetchPromotionCodeByName,
  getClientSecretForPaymentIntent,
  getClientSecretForSubscriptionIntent,
  getUpsellManager,
};

export default checkoutService;
